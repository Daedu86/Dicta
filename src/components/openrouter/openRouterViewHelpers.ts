import type { ActiveOpenRouterJob, OpenRouterJobResponse } from '../../core/openRouterJobs';
import { isTransientOpenRouterGenerationError } from '../../core/adaptive/openRouterFallbackScript';
import { parseDictationScriptJson, type DictationScriptValidationResult } from '../../core/adaptive/dictationScriptValidation';
import type { InputMode } from '../../core/adaptive/types';
import { normalizeInputMode } from '../../core/adaptive/inputModes';
import { isSupportedLanguage } from '../../core/languages';
import type {
  BenchmarkLanguageButton,
  OpenRouterGenerationSlotId,
  OpenRouterGenerationSlots,
  OpenRouterGenerationSlotState,
  OpenRouterJobNotification,
  OpenRouterModelSummary,
  PersistedOpenRouterGeneration,
  TrainingGenerationNotice,
  TrainingGenerationNoticeView,
} from './types';

export const OPENROUTER_GENERATED_SCRIPT_KEY = 'dicta.openrouterGeneratedScript.v1';
export const OPENROUTER_GENERATED_VARIANTS_KEY = 'dicta.openrouterGeneratedVariants.v1';
export const OPENROUTER_GENERATION_SLOT_IDS: OpenRouterGenerationSlotId[] = ['prompt1', 'prompt2'];

type OpenRouterWakeLockSentinel = {
  released?: boolean;
  release: () => Promise<void>;
};

type OpenRouterWakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<OpenRouterWakeLockSentinel>;
  };
};

export function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }
  return trimmed;
}

export function validateGeneratedScriptForTarget(
  raw: string,
  targetInputMode: InputMode,
  targetLanguage: BenchmarkLanguageButton,
): DictationScriptValidationResult {
  const result = parseDictationScriptJson(raw);
  if (!result.ok) return result;
  const normalizedInputMode = normalizeInputMode(String(result.script.inputMode).trim().toLowerCase().replace(/_/g, '-'));
  const normalizedLanguage = String(result.script.language).trim().toLowerCase();
  const errors: string[] = [];
  if (normalizedInputMode !== targetInputMode) {
    errors.push(`inputMode must be exactly ${targetInputMode}.`);
  }
  if (normalizedLanguage !== targetLanguage) {
    errors.push(`language must be exactly ${targetLanguage}.`);
  }
  if (errors.length > 0) {
    return { ok: false, script: null, errors };
  }
  return result;
}

export function buildOpenRouterModelOptions(
  models: OpenRouterModelSummary[],
  assignedModels: Array<string | null | undefined> = [],
): OpenRouterModelSummary[] {
  const byId = new Map<string, OpenRouterModelSummary>();
  for (const model of models) {
    const id = model.id.trim();
    if (id) byId.set(id, { ...model, id });
  }
  for (const assignedModel of assignedModels) {
    const id = assignedModel?.trim();
    if (id && !byId.has(id)) byId.set(id, { id });
  }
  return [...byId.values()].sort((a, b) => {
    if (a.id === 'openrouter/free') return -1;
    if (b.id === 'openrouter/free') return 1;
    return a.id.localeCompare(b.id);
  });
}

export function formatElapsedMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function parseTimestampMs(value: string, fallbackMs: number): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

export function buildOpenRouterJobNotification(
  trackedJob: ActiveOpenRouterJob,
  job: OpenRouterJobResponse | null,
  error?: string,
): OpenRouterJobNotification {
  const status: OpenRouterJobNotification['status'] = error
    ? 'failed'
    : job?.status === 'succeeded' || job?.status === 'failed'
      ? job.status
      : 'running';
  return {
    jobId: trackedJob.jobId,
    slotLabel: trackedJob.slotLabel,
    model: trackedJob.model,
    startedAt: trackedJob.startedAt,
    status,
    ...(status === 'running' ? {} : { completedAt: job?.completedAt || job?.updatedAt || new Date().toISOString() }),
    ...(error || job?.error ? { error: error || job?.error } : {}),
  };
}

export function formatOpenRouterJobNotifications(notifications: Record<string, OpenRouterJobNotification>): string {
  const ordered = Object.values(notifications)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 4);
  if (ordered.length === 0) return '';

  return ordered
    .map((notification) => {
      const startedMs = new Date(notification.startedAt).getTime();
      const displayLabel = formatOpenRouterSlotDisplayLabel(notification.slotLabel);
      const elapsedMs =
        notification.completedAt
          ? new Date(notification.completedAt).getTime() - startedMs
          : Date.now() - startedMs;
      const elapsed = formatElapsedMs(Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0));
      if (notification.status === 'succeeded') {
        return `${displayLabel} finished with ${notification.model} in ${elapsed}.`;
      }
      if (notification.status === 'failed') {
        return `${displayLabel} failed with ${notification.model} after ${elapsed}${notification.error ? `: ${notification.error}` : '.'}`;
      }
      return `${displayLabel} running with ${notification.model}; elapsed ${elapsed}.`;
    })
    .join(' ');
}

export function formatOpenRouterSlotDisplayLabel(slotLabel: string): string {
  switch (resolveOpenRouterTrainingIntentFromLabel(slotLabel)) {
    case 'precision':
      return 'Precision session';
    case 'stabilize':
      return 'Stabilize session';
    case 'challenge':
      return 'Challenge session';
    default:
      return slotLabel;
  }
}

function getOpenRouterTrainingSlotAliases(slotLabel: string): string[] {
  switch (resolveOpenRouterTrainingIntentFromLabel(slotLabel)) {
    case 'precision':
      return ['Easy direct session', 'Express easy direct session'];
    case 'stabilize':
      return ['Intermediate direct session', 'Express intermediate direct session'];
    case 'challenge':
      return ['Advanced direct session', 'Express advanced direct session'];
    default:
      return [slotLabel];
  }
}

function resolveOpenRouterTrainingIntentFromLabel(slotLabel: string): 'precision' | 'stabilize' | 'challenge' | null {
  const normalized = slotLabel.trim().toLowerCase();
  if (normalized.includes('easy')) return 'precision';
  if (normalized.includes('intermediate') || normalized.includes('medium')) return 'stabilize';
  if (normalized.includes('advanced') || normalized.includes('hard')) return 'challenge';
  return null;
}

export function buildTrainingGenerationButtonNotice({
  slotLabel,
  displayLabel,
  notices,
  jobNotifications,
  activeJobs,
  nowMs,
}: {
  slotLabel: string;
  displayLabel: string;
  notices: Record<string, TrainingGenerationNotice>;
  jobNotifications: Record<string, OpenRouterJobNotification>;
  activeJobs: ActiveOpenRouterJob[];
  nowMs: number;
}): TrainingGenerationNoticeView | null {
  const slotAliases = getOpenRouterTrainingSlotAliases(slotLabel);
  const localNotice = slotAliases.map((alias) => notices[alias]).find(Boolean);
  const activeJob = [...activeJobs]
    .filter((job) => slotAliases.includes(job.slotLabel))
    .sort((a, b) => parseTimestampMs(b.startedAt, nowMs) - parseTimestampMs(a.startedAt, nowMs))[0];
  if (activeJob) {
    return formatTrainingGenerationNotice({
      slotLabel: activeJob.slotLabel,
      displayLabel,
      model: activeJob.model,
      startedAt: activeJob.startedAt,
      status: 'running',
    }, nowMs);
  }

  if (localNotice && localNotice.status !== 'running') {
    return formatTrainingGenerationNotice({ ...localNotice, displayLabel }, nowMs);
  }

  const jobNotification = Object.values(jobNotifications)
    .filter((notification) => slotAliases.includes(notification.slotLabel))
    .sort((a, b) => parseTimestampMs(b.startedAt, nowMs) - parseTimestampMs(a.startedAt, nowMs))[0];
  if (jobNotification) {
    return formatTrainingGenerationNotice({
      slotLabel: jobNotification.slotLabel,
      displayLabel,
      model: jobNotification.model,
      startedAt: jobNotification.startedAt,
      status: jobNotification.status,
      completedAt: jobNotification.completedAt,
      error: jobNotification.error,
    }, nowMs);
  }

  if (localNotice) {
    return formatTrainingGenerationNotice({ ...localNotice, displayLabel }, nowMs);
  }

  return null;
}

export function formatTrainingGenerationNotice(
  notice: TrainingGenerationNotice,
  nowMs: number,
): TrainingGenerationNoticeView {
  const startedMs = parseTimestampMs(notice.startedAt, nowMs);
  const completedMs = notice.completedAt ? parseTimestampMs(notice.completedAt, nowMs) : nowMs;
  const elapsed = formatElapsedMs(Math.max(0, completedMs - startedMs));

  if (notice.status === 'succeeded') {
    return {
      tone: 'success',
      message: `${notice.displayLabel} created in ${elapsed}.`,
    };
  }

  if (notice.status === 'failed') {
    return {
      tone: 'error',
      message: `${notice.displayLabel} could not be created after ${elapsed}${notice.error ? `: ${notice.error}` : '.'}`,
    };
  }

  return {
    tone: 'hint',
    message: `${notice.displayLabel} is being created... elapsed ${elapsed}.`,
  };
}

export function getOpenRouterSlotLabel(slotId: OpenRouterGenerationSlotId): string {
  return slotId === 'prompt1' ? 'Session 1' : 'Session 2';
}

export function createEmptyOpenRouterGenerationSlot(defaultModel = ''): OpenRouterGenerationSlotState {
  return {
    notes: '',
    model: defaultModel,
    text: '',
    json: '',
    inputMode: null,
    language: null,
    usage: null,
    elapsedMs: null,
    generatedAt: null,
    error: '',
  };
}

export function createEmptyOpenRouterGenerationSlots(defaultModel = ''): OpenRouterGenerationSlots {
  return {
    prompt1: createEmptyOpenRouterGenerationSlot(defaultModel),
    prompt2: createEmptyOpenRouterGenerationSlot(defaultModel),
  };
}

export function loadPersistedOpenRouterGenerationVariants(defaultModel = ''): OpenRouterGenerationSlots | null {
  try {
    const raw = window.localStorage.getItem(OPENROUTER_GENERATED_VARIANTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OpenRouterGenerationSlots>;
    return {
      prompt1: { ...createEmptyOpenRouterGenerationSlot(defaultModel), ...(parsed.prompt1 ?? {}) },
      prompt2: { ...createEmptyOpenRouterGenerationSlot(defaultModel), ...(parsed.prompt2 ?? {}) },
    };
  } catch {
    return null;
  }
}

export function persistOpenRouterGenerationVariants(slots: OpenRouterGenerationSlots): void {
  window.localStorage.setItem(OPENROUTER_GENERATED_VARIANTS_KEY, JSON.stringify(slots));
}

export function loadPersistedOpenRouterGeneration(): PersistedOpenRouterGeneration | null {
  try {
    const raw = window.localStorage.getItem(OPENROUTER_GENERATED_SCRIPT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedOpenRouterGeneration;
  } catch {
    return null;
  }
}

export function persistOpenRouterGeneration(payload: PersistedOpenRouterGeneration): void {
  window.localStorage.setItem(OPENROUTER_GENERATED_SCRIPT_KEY, JSON.stringify(payload));
}

export function formatInterruptedOpenRouterMessage(slotLabel: string, model: string, elapsedMs: number): string {
  return `${slotLabel} request for ${model} was interrupted after ${formatElapsedMs(elapsedMs)}. It may still finish in the background.`;
}

export function shouldCreatePersistentGenerationErrorSession(message: string): boolean {
  return !isTransientOpenRouterGenerationError(message);
}

export function releaseOpenRouterWakeLock(wakeLock: OpenRouterWakeLockSentinel | null): void {
  void wakeLock?.release().catch(() => {});
}

export async function requestOpenRouterWakeLock(): Promise<OpenRouterWakeLockSentinel | null> {
  const wakeLock = (navigator as OpenRouterWakeLockNavigator).wakeLock;
  if (!wakeLock) return null;
  try {
    return await wakeLock.request('screen');
  } catch {
    return null;
  }
}

export function formatTrainingGenerationNoticeMessage(notice: TrainingGenerationNoticeView | null): string {
  return notice?.message ?? '';
}

export function mapOpenRouterJobResultToPersistedGeneration(job: OpenRouterJobResponse, elapsedMs: number | null): PersistedOpenRouterGeneration | null {
  const result = job.result;
  if (!result || typeof result !== 'object') return null;
  const text = 'text' in result && typeof result.text === 'string' ? result.text : '';
  if (!text.trim()) return null;
  const requestInputMode = normalizeInputMode(typeof job.request?.inputMode === 'string' ? job.request.inputMode : '');
  if (requestInputMode !== 'browser-tts') return null;
  return {
    text,
    json: text,
    inputMode: requestInputMode,
    language: isSupportedLanguage(job.request?.language) ? job.request.language : 'de',
    usage: null,
    elapsedMs,
  };
}
