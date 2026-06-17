import type { DictationScriptDifficulty } from './adaptive/dictationScriptValidation';
import type { OpenRouterDurationMinutes } from './adaptive/openRouterGenerationPrompt';
import type { InputMode, LanguageCode } from './adaptive/types';

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

export type OpenRouterUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};
