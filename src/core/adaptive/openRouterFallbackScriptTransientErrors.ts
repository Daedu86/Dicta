type UnknownRecord = Record<string, unknown>;

export function isTransientOpenRouterGenerationError(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes('failed to reach openrouter endpoint') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('timed out') ||
    normalized.includes('timeout') ||
    normalized.includes('network') ||
    normalized.includes('function_invocation_timeout') ||
    normalized.includes('deployment function') ||
    normalized.includes('session expired') ||
    normalized.includes('sign in to dicta') ||
    normalized.includes('unauthorized')
  );
}

export function isTransientGenerationErrorSessionLike(value: unknown): boolean {
  const record = asRecord(value);
  const name = typeof record.name === 'string' ? record.name.toLowerCase() : '';
  const message = typeof record.generationError === 'string' ? record.generationError : '';
  return record.status === 'error' && name.includes('generation error') && isTransientOpenRouterGenerationError(message);
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
}
