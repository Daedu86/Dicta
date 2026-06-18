export type LocalStorageWriteResult =
  | { ok: true }
  | { ok: false; error: unknown; quotaExceeded: true };

export function trySetLocalStorageItem(key: string, value: string): LocalStorageWriteResult {
  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    if (!isLocalStorageQuotaExceeded(error)) {
      throw error;
    }

    return {
      ok: false,
      error,
      quotaExceeded: true,
    };
  }
}

export function isLocalStorageQuotaExceeded(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    candidate.code === 22 ||
    candidate.code === 1014
  );
}
