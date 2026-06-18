export type SafeLocalStorageWriteResult =
  | { ok: true }
  | { ok: false; error: unknown; quotaExceeded: boolean };

export function safeGetLocalStorageItem(
  key: string,
  storage: Storage | null | undefined = getWindowLocalStorage(),
): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch (error) {
    console.warn('[DictaStorage] localStorage read failed', { key, error });
    return null;
  }
}

export function safeSetLocalStorageItem(
  key: string,
  value: string,
  storage: Storage | null | undefined = getWindowLocalStorage(),
): SafeLocalStorageWriteResult {
  if (!storage) {
    return { ok: false, error: new Error('localStorage unavailable'), quotaExceeded: false };
  }

  try {
    storage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    console.warn('[DictaStorage] localStorage write failed', { key, error });
    return { ok: false, error, quotaExceeded: isLocalStorageQuotaExceeded(error) };
  }
}

export function safeRemoveLocalStorageItem(
  key: string,
  storage: Storage | null | undefined = getWindowLocalStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('[DictaStorage] localStorage remove failed', { key, error });
    return false;
  }
}

export function getLocalStorageUsageEstimate(
  storage: Storage | null | undefined = getWindowLocalStorage(),
): { entries: number; bytes: number } {
  if (!storage) return { entries: 0, bytes: 0 };
  let bytes = 0;
  let entries = 0;
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const value = storage.getItem(key) ?? '';
      entries += 1;
      bytes += byteLength(key) + byteLength(value);
    }
  } catch (error) {
    console.warn('[DictaStorage] localStorage usage estimate failed', error);
  }
  return { entries, bytes };
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

function getWindowLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function byteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).byteLength;
  }
  return value.length * 2;
}
