import { isTransientOpenRouterGenerationError } from '../../core/adaptive/openRouterFallbackScript';
import { normalizeInputMode } from '../../core/adaptive/inputModes';
import { isSupportedLanguage } from '../../core/languages';
import type { OpenRouterJobResponse } from '../../core/openRouterJobs';
import type { PersistedOpenRouterGeneration } from './types';

export function shouldCreatePersistentGenerationErrorSession(message: string): boolean {
  return !isTransientOpenRouterGenerationError(message);
}

export function mapOpenRouterJobResultToPersistedGeneration(
  job: OpenRouterJobResponse,
  elapsedMs: number | null,
): PersistedOpenRouterGeneration | null {
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
