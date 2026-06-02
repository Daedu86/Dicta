import type { ActiveOpenRouterJob, OpenRouterJobResponse } from '../../core/openRouterJobs';
import { isTransientOpenRouterGenerationError } from '../../core/adaptive/openRouterFallbackScript';
import { parseDictationScriptJson, type DictationScriptValidationResult } from '../../core/adaptive/dictationScriptValidation';
import type { InputMode } from '../../core/adaptive/types';
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
  const normalizedInputMode = String(result.script.inputMode).trim().toLowerCase().replace(/_/g, '-');
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
  byId.set('openrouter/free', { id: 'openrouter/free' });
  for (const model of models) {
    if (model.id.trim()) byId.set(model.id, model);
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
      const elapsedMs =
        notification.completedAt
          ? new Date(notification.completedAt).getTime() - startedMs
          : Date.now() - startedMs;
      const elapsed = formatElapsedMs(Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0));
      if (notification.status === 'succeeded') {
        return `${notification.slotLabel} finished with ${notification.model} in ${elapsed}.`;
      }
      if (notification.status === 'failed') {
        return `${notification.slotLabel} failed with ${notification.model} after ${elapsed}${notification.error ? `: ${notification.error}` : '.'}`;
      }
      return `${notification.slotLabel} running with ${notification.model}; elapsed ${elapsed}.`;
    })
    .join(' ');
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
  const localNotice = notices[slotLabel];
  const activeJob = [...activeJobs]
    .filter((job) => job.slotLabel === slotLabel)
    .sort((a, b) => parseTimestampMs(b.startedAt, nowMs) - parseTimestampMs(a.startedAt, nowMs))[0];
  if (activeJob) {
    return formatTrainingGenerationNotice({
      slotLabel,
      displayLabel,
      model: activeJob.model,
      startedAt: activeJob.startedAt,
      status: 'running',
    }, nowMs);
  }

  if (localNotice && localNotice.status !== 'running') {
    return formatTrainingGenerationNotice(localNotice, nowMs);
  }

  const jobNotification = Object.values(jobNotifications)
    .filter((notification) => notification.slotLabel === slotLabel)
    .sort((a, b) => parseTimestampMs(b.startedAt, nowMs) - parseTimestampMs(a.startedAt, nowMs))[0];
  if (jobNotification) {
    return formatTrainingGenerationNotice({
      slotLabel,
      displayLabel,
      model: jobNotification.model,
      startedAt: jobNotification.startedAt,
      status: jobNotification.status,
      completedAt: jobNotification.completedAt,
      error: jobNotification.error,
    }, nowMs);
  }

  if (localNotice) {
    return formatTrainingGenerationNotice(localNotice, nowMs);
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

export function loadPersistedOpenRouterGenerationVariants(defaultModel = ''): OpenRouterGenerationSlots {
  const raw = window.localStorage.getItem(OPENROUTER_GENERATED_VARIANTS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Record<OpenRouterGenerationSlotId, Partial<OpenRouterGenerationSlotState>>>;
      return {
        prompt1: normalizeOpenRouterGenerationSlot(parsed.prompt1, defaultModel),
        prompt2: normalizeOpenRouterGenerationSlot(parsed.prompt2, defaultModel),
      };
    } catch {
      return createEmptyOpenRouterGenerationSlots(defaultModel);
    }
  }

  const legacyDraft = loadPersistedOpenRouterGeneration();
  if (!legacyDraft) return createEmptyOpenRouterGenerationSlots(defaultModel);
  return {
    prompt1: {
      ...createEmptyOpenRouterGenerationSlot(defaultModel),
      text: legacyDraft.text,
      json: legacyDraft.json,
      inputMode: legacyDraft.inputMode,
      language: legacyDraft.language,
      usage: legacyDraft.usage,
      elapsedMs: legacyDraft.elapsedMs,
      generatedAt: new Date().toISOString(),
    },
    prompt2: createEmptyOpenRouterGenerationSlot(defaultModel),
  };
}

export function persistOpenRouterGenerationVariants(slots: OpenRouterGenerationSlots): void {
  window.localStorage.setItem(OPENROUTER_GENERATED_VARIANTS_KEY, JSON.stringify(slots));
  window.localStorage.removeItem(OPENROUTER_GENERATED_SCRIPT_KEY);
}

export function shouldCreatePersistentGenerationErrorSession(message: string): boolean {
  return !isTransientOpenRouterGenerationError(message);
}

type OpenRouterWakeLockSentinel = {
  released?: boolean;
  release: () => Promise<void>;
};

type OpenRouterWakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<OpenRouterWakeLockSentinel>;
  };
};

export async function requestOpenRouterWakeLock(): Promise<OpenRouterWakeLockSentinel | null> {
  if (typeof navigator === 'undefined') return null;
  const wakeLock = (navigator as OpenRouterWakeLockNavigator).wakeLock;
  if (!wakeLock) return null;
  try {
    return await wakeLock.request('screen');
  } catch {
    return null;
  }
}

export async function releaseOpenRouterWakeLock(wakeLock: OpenRouterWakeLockSentinel | null): Promise<void> {
  if (!wakeLock || wakeLock.released) return;
  try {
    await wakeLock.release();
  } catch {
    // The browser may release the lock automatically when the page is hidden.
  }
}

export function formatInterruptedOpenRouterMessage(message: string): string {
  return `${message} No local fallback was created. Keep Dicta open and unlocked while OpenRouter finishes, then retry if the request was interrupted.`;
}

function loadPersistedOpenRouterGeneration(): PersistedOpenRouterGeneration | null {
  const raw = window.localStorage.getItem(OPENROUTER_GENERATED_SCRIPT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedOpenRouterGeneration>;
    if (
      typeof parsed.text !== 'string' ||
      typeof parsed.json !== 'string' ||
      !isAdaptiveInputMode(parsed.inputMode) ||
      !isBenchmarkLanguageButton(parsed.language)
    ) {
      return null;
    }
    const usage = parsed.usage;
    return {
      text: parsed.text,
      json: parsed.json,
      inputMode: parsed.inputMode,
      language: parsed.language,
      usage:
        usage &&
        Number.isFinite(usage.promptTokens) &&
        Number.isFinite(usage.completionTokens) &&
        Number.isFinite(usage.totalTokens)
          ? {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            }
          : null,
      elapsedMs: typeof parsed.elapsedMs === 'number' && Number.isFinite(parsed.elapsedMs) ? parsed.elapsedMs : null,
    };
  } catch {
    return null;
  }
}

function normalizeOpenRouterGenerationSlot(
  raw: Partial<OpenRouterGenerationSlotState> | null | undefined,
  defaultModel: string,
): OpenRouterGenerationSlotState {
  const usage = raw?.usage;
  return {
    notes: typeof raw?.notes === 'string' ? raw.notes : '',
    model: typeof raw?.model === 'string' ? raw.model : defaultModel,
    text: typeof raw?.text === 'string' ? raw.text : '',
    json: typeof raw?.json === 'string' ? raw.json : '',
    inputMode: isAdaptiveInputMode(raw?.inputMode) ? raw.inputMode : null,
    language: isBenchmarkLanguageButton(raw?.language) ? raw.language : null,
    usage:
      usage &&
      Number.isFinite(usage.promptTokens) &&
      Number.isFinite(usage.completionTokens) &&
      Number.isFinite(usage.totalTokens)
        ? {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          }
        : null,
    elapsedMs: typeof raw?.elapsedMs === 'number' && Number.isFinite(raw.elapsedMs) ? raw.elapsedMs : null,
    generatedAt: typeof raw?.generatedAt === 'string' ? raw.generatedAt : null,
    error: typeof raw?.error === 'string' ? raw.error : '',
  };
}

function isAdaptiveInputMode(value: unknown): value is InputMode {
  return value === 'audio' || value === 'browser-tts' || value === 'kokoro' || value === 'qwen-cloud';
}

function isBenchmarkLanguageButton(value: unknown): value is BenchmarkLanguageButton {
  return isSupportedLanguage(value);
}
