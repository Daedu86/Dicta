import {
  safeSetLocalStorageItem,
} from '../core/storage/safeLocalStorage';

export type LocalStorageWriteResult =
  | { ok: true }
  | { ok: false; error: unknown; quotaExceeded: true };

export function trySetLocalStorageItem(key: string, value: string): LocalStorageWriteResult {
  const result = safeSetLocalStorageItem(key, value);
  if (result.ok) return { ok: true };
  if (result.quotaExceeded) {
    return {
      ok: false,
      error: result.error,
      quotaExceeded: true,
    };
  }
  throw result.error;
}
