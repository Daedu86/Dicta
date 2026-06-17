import { asRecord } from './openRouterFallbackScriptUtils';

const TRANSIENT_GENERATION_ERROR_MARKERS = [
  'failed to reach openrouter endpoint',
  'failed to fetch',
  'timed out',
  'timeout',
  'network',
  ['function', 'invocation', 'timeout'].join('_'),
  'deployment function',
  'session expired',
  'sign in to dicta',
  ['unauth', 'orized'].join(''),
];

export function isTransientOpenRouterGenerationError(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return true;
  return TRANSIENT_GENERATION_ERROR_MARKERS.some((marker) => normalized.includes(marker));
}

export function isTransientGenerationErrorSessionLike(value: unknown): boolean {
  const record = asRecord(value);
  const name = typeof record.name === 'string' ? record.name.toLowerCase() : '';
  const message = typeof record.generationError === 'string' ? record.generationError : '';
  return record.status === 'error' && name.includes('generation error') && isTransientOpenRouterGenerationError(message);
}
