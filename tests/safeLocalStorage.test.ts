// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLocalStorageUsageEstimate,
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
} from '../src/core/storage/safeLocalStorage';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('safeLocalStorage', () => {
  it('does not throw when a quota error rejects a write', () => {
    const error = new DOMException('Quota exceeded', 'QuotaExceededError');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw error;
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => safeSetLocalStorageItem('dicta.small.v1', 'x'.repeat(200_000))).not.toThrow();
    expect(safeSetLocalStorageItem('dicta.small.v1', 'value')).toEqual({
      ok: false,
      error,
      quotaExceeded: true,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      '[DictaStorage] localStorage write failed',
      expect.objectContaining({ key: 'dicta.small.v1', error }),
    );
  });

  it('returns null when a read fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(safeGetLocalStorageItem('dicta.blocked.v1')).toBeNull();
  });

  it('estimates localStorage usage without requiring payload parsing', () => {
    window.localStorage.setItem('dicta.pref.v1', 'abc');

    expect(getLocalStorageUsageEstimate()).toMatchObject({
      entries: 1,
    });
    expect(getLocalStorageUsageEstimate().bytes).toBeGreaterThan(0);
  });
});
