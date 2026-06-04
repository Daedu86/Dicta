import type { DictationScriptDifficulty } from './adaptive/dictationScriptValidation';
import type { OpenRouterDurationMinutes } from './adaptive/openRouterGenerationPrompt';
import type { InputMode, LanguageCode } from './adaptive/types';
import { isSupportedLanguage } from './languages';
import { isStoredInputMode, normalizeInputMode } from './adaptive/inputModes';

export const OPENROUTER_ACTIVE_JOB_STORAGE_KEY = 'dicta.openrouterActiveJob.v1';
export const OPENROUTER_ACTIVE_JOBS_STORAGE_KEY = 'dicta.openrouterActiveJobs.v1';

export type OpenRouterJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type OpenRouterJobOrigin = 'direct-training' | 'custom-workspace';
export type OpenRouterCustomSlotId = 'prompt1' | 'prompt2';

export type ActiveOpenRouterJob = {
  jobId: string;
  model: string;
  slotLabel: string;
  inputMode: InputMode;
  language: LanguageCode;
  durationMinutes: OpenRouterDurationMinutes;
  targetDifficulty?: DictationScriptDifficulty;
  promptMode?: string;
  promptCharacterCount?: number;
  promptApproximateTokenCount?: number;
  origin?: OpenRouterJobOrigin;
  customSlotId?: OpenRouterCustomSlotId;
  startedAt: string;
};

export type OpenRouterJobResponse = {
  jobId: string;
  status: OpenRouterJobStatus;
  request?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
};

export function loadActiveOpenRouterJob(): ActiveOpenRouterJob | null {
  return loadActiveOpenRouterJobs()[0] ?? null;
}

export function loadActiveOpenRouterJobs(): ActiveOpenRouterJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const rawJobs = window.localStorage.getItem(OPENROUTER_ACTIVE_JOBS_STORAGE_KEY);
    if (rawJobs) {
      const parsed = JSON.parse(rawJobs);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeActiveOpenRouterJob).filter((job): job is ActiveOpenRouterJob => Boolean(job));
      }
    }
    const legacyJob = normalizeActiveOpenRouterJob(JSON.parse(window.localStorage.getItem(OPENROUTER_ACTIVE_JOB_STORAGE_KEY) ?? 'null'));
    return legacyJob ? [legacyJob] : [];
  } catch {
    return [];
  }
}

export function persistActiveOpenRouterJob(job: ActiveOpenRouterJob): void {
  persistActiveOpenRouterJobs([job]);
}

export function persistActiveOpenRouterJobs(jobs: ActiveOpenRouterJob[]): void {
  window.localStorage.setItem(OPENROUTER_ACTIVE_JOBS_STORAGE_KEY, JSON.stringify(jobs));
  window.localStorage.removeItem(OPENROUTER_ACTIVE_JOB_STORAGE_KEY);
}

export function addActiveOpenRouterJob(job: ActiveOpenRouterJob, currentJobs: ActiveOpenRouterJob[]): ActiveOpenRouterJob[] {
  const nextJobs = [...currentJobs.filter((current) => current.jobId !== job.jobId), job];
  persistActiveOpenRouterJobs(nextJobs);
  return nextJobs;
}

export function removeActiveOpenRouterJob(jobId: string, currentJobs: ActiveOpenRouterJob[]): ActiveOpenRouterJob[] {
  const nextJobs = currentJobs.filter((job) => job.jobId !== jobId);
  if (nextJobs.length > 0) {
    persistActiveOpenRouterJobs(nextJobs);
  } else {
    clearActiveOpenRouterJob();
  }
  return nextJobs;
}

export function clearActiveOpenRouterJob(): void {
  window.localStorage.removeItem(OPENROUTER_ACTIVE_JOB_STORAGE_KEY);
  window.localStorage.removeItem(OPENROUTER_ACTIVE_JOBS_STORAGE_KEY);
}

export function extractOpenRouterJobText(result: unknown): string {
  const record = asRecord(result);
  const text = typeof record.text === 'string' ? record.text : '';
  if (text.trim()) return text;

  const payload = asRecord(record.payload);
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const content = asRecord(asRecord(choices[0]).message).content;
  return typeof content === 'string' ? content : '';
}

export type OpenRouterUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export function extractOpenRouterJobUsage(result: unknown): OpenRouterUsage | null {
  const record = asRecord(result);
  const payload = asRecord(record.payload);
  const usage = asRecord(payload.usage);
  const promptTokens = Number(usage.prompt_tokens);
  const completionTokens = Number(usage.completion_tokens);
  const totalTokens = Number(usage.total_tokens);

  if (!Number.isFinite(promptTokens) && !Number.isFinite(completionTokens) && !Number.isFinite(totalTokens)) {
    return null;
  }

  const safePromptTokens = Number.isFinite(promptTokens) ? promptTokens : 0;
  const safeCompletionTokens = Number.isFinite(completionTokens) ? completionTokens : 0;
  return {
    promptTokens: safePromptTokens,
    completionTokens: safeCompletionTokens,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : safePromptTokens + safeCompletionTokens,
  };
}

export function isOpenRouterJobTerminal(status: OpenRouterJobStatus): boolean {
  return status === 'succeeded' || status === 'failed';
}

function normalizeActiveOpenRouterJob(value: unknown): ActiveOpenRouterJob | null {
  const record = asRecord(value);
  const jobId = stringField(record, 'jobId');
  const model = stringField(record, 'model');
  const slotLabel = stringField(record, 'slotLabel');
  const inputMode = stringField(record, 'inputMode');
  const language = stringField(record, 'language');
  const durationMinutes = Number(record.durationMinutes);
  const startedAt = stringField(record, 'startedAt');
  const canonicalInputMode = normalizeInputMode(inputMode);

  if (!jobId || !model || !slotLabel || !isInputMode(inputMode) || !canonicalInputMode || !isLanguage(language) || !isDuration(durationMinutes) || !startedAt) {
    return null;
  }

  const targetDifficulty = stringField(record, 'targetDifficulty');
  const promptMode = stringField(record, 'promptMode');
  const promptCharacterCount = finiteNumberField(record, 'promptCharacterCount');
  const promptApproximateTokenCount = finiteNumberField(record, 'promptApproximateTokenCount');
  const origin = stringField(record, 'origin');
  const customSlotId = stringField(record, 'customSlotId');
  return {
    jobId,
    model,
    slotLabel,
    inputMode: canonicalInputMode,
    language,
    durationMinutes,
    ...(targetDifficulty === 'easy' || targetDifficulty === 'normal' || targetDifficulty === 'hard' ? { targetDifficulty } : {}),
    ...(promptMode ? { promptMode } : {}),
    ...(promptCharacterCount !== null ? { promptCharacterCount } : {}),
    ...(promptApproximateTokenCount !== null ? { promptApproximateTokenCount } : {}),
    ...(origin === 'direct-training' || origin === 'custom-workspace' ? { origin } : {}),
    ...(customSlotId === 'prompt1' || customSlotId === 'prompt2' ? { customSlotId } : {}),
    startedAt,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringField(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === 'string' ? record[key] : '';
}

function finiteNumberField(record: Record<string, unknown>, key: string): number | null {
  const value = Number(record[key]);
  return Number.isFinite(value) ? value : null;
}

function isInputMode(value: string): boolean {
  return isStoredInputMode(value);
}

function isLanguage(value: string): value is LanguageCode {
  return isSupportedLanguage(value);
}

function isDuration(value: number): value is OpenRouterDurationMinutes {
  return value === 1 || value === 2 || value === 3 || value === 4;
}
