import { describe, expect, it } from 'vitest';
import {
  LEGACY_PROFILE_SCOPED_STORAGE_ID,
  PROFILE_SCOPED_STORAGE_MARKER_KEY,
  profileScopedStorageKey,
  readActiveSyncStorageProfileId,
  switchProfileScopedStorage,
} from '../src/core/profileScopedStorage';

const SCOPED_KEYS = [
  'dicta.sessions.v1',
  'dicta.deletedSessionIds.v1',
  'dicta.adaptiveBenchmarks.v1',
] as const;

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  constructor(initial: Record<string, string> = {}) {
    Object.entries(initial).forEach(([key, value]) => this.store.set(key, value));
  }

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('profile scoped storage', () => {
  it('moves dirty unscoped Dicta data out of the active profile before first authenticated sync', () => {
    const storage = new MemoryStorage({
      'dicta.sessions.v1': '[{"id":"legacy-session"}]',
      'dicta.adaptiveBenchmarks.v1': '{"browser-tts:de":{"sampleCount":3}}',
      'dicta.themeMode.v1': 'dark',
    });

    const result = switchProfileScopedStorage(storage, SCOPED_KEYS, 'codex-tester');

    expect(result).toEqual({
      changed: true,
      previousProfileId: '',
      activeProfileId: 'codex-tester',
    });
    expect(readActiveSyncStorageProfileId(storage)).toBe('codex-tester');
    expect(storage.getItem('dicta.sessions.v1')).toBeNull();
    expect(storage.getItem('dicta.adaptiveBenchmarks.v1')).toBeNull();
    expect(storage.getItem('dicta.themeMode.v1')).toBe('dark');
    expect(JSON.parse(storage.getItem(profileScopedStorageKey(LEGACY_PROFILE_SCOPED_STORAGE_ID)) ?? '{}')).toEqual({
      'dicta.sessions.v1': '[{"id":"legacy-session"}]',
      'dicta.adaptiveBenchmarks.v1': '{"browser-tts:de":{"sampleCount":3}}',
    });
  });

  it('saves the previous authenticated profile and restores the next profile snapshot', () => {
    const storage = new MemoryStorage({
      [PROFILE_SCOPED_STORAGE_MARKER_KEY]: 'dicta-main',
      'dicta.sessions.v1': '[{"id":"main-session"}]',
      'dicta.deletedSessionIds.v1': '["main-deleted"]',
      [profileScopedStorageKey('codex-tester')]: JSON.stringify({
        'dicta.sessions.v1': '[{"id":"tester-session"}]',
        'dicta.adaptiveBenchmarks.v1': '{"audio:en":{"sampleCount":1}}',
      }),
    });

    const result = switchProfileScopedStorage(storage, SCOPED_KEYS, 'codex-tester');

    expect(result.previousProfileId).toBe('dicta-main');
    expect(result.activeProfileId).toBe('codex-tester');
    expect(JSON.parse(storage.getItem(profileScopedStorageKey('dicta-main')) ?? '{}')).toEqual({
      'dicta.sessions.v1': '[{"id":"main-session"}]',
      'dicta.deletedSessionIds.v1': '["main-deleted"]',
    });
    expect(storage.getItem('dicta.sessions.v1')).toBe('[{"id":"tester-session"}]');
    expect(storage.getItem('dicta.deletedSessionIds.v1')).toBeNull();
    expect(storage.getItem('dicta.adaptiveBenchmarks.v1')).toBe('{"audio:en":{"sampleCount":1}}');
  });

  it('restores a saved profile when switching back', () => {
    const storage = new MemoryStorage({
      [PROFILE_SCOPED_STORAGE_MARKER_KEY]: 'codex-tester',
      'dicta.sessions.v1': '[{"id":"tester-session"}]',
      [profileScopedStorageKey('dicta-main')]: JSON.stringify({
        'dicta.sessions.v1': '[{"id":"main-session"}]',
        'dicta.deletedSessionIds.v1': '["main-deleted"]',
      }),
    });

    switchProfileScopedStorage(storage, SCOPED_KEYS, 'dicta-main');

    expect(readActiveSyncStorageProfileId(storage)).toBe('dicta-main');
    expect(storage.getItem('dicta.sessions.v1')).toBe('[{"id":"main-session"}]');
    expect(storage.getItem('dicta.deletedSessionIds.v1')).toBe('["main-deleted"]');
    expect(JSON.parse(storage.getItem(profileScopedStorageKey('codex-tester')) ?? '{}')).toEqual({
      'dicta.sessions.v1': '[{"id":"tester-session"}]',
    });
  });

  it('treats a malformed target profile snapshot as empty storage', () => {
    const storage = new MemoryStorage({
      [PROFILE_SCOPED_STORAGE_MARKER_KEY]: 'dicta-main',
      'dicta.sessions.v1': '[{"id":"main-session"}]',
      [profileScopedStorageKey('codex-tester')]: '{not-json',
    });

    switchProfileScopedStorage(storage, SCOPED_KEYS, 'codex-tester');

    expect(readActiveSyncStorageProfileId(storage)).toBe('codex-tester');
    expect(storage.getItem('dicta.sessions.v1')).toBeNull();
    expect(JSON.parse(storage.getItem(profileScopedStorageKey('dicta-main')) ?? '{}')).toEqual({
      'dicta.sessions.v1': '[{"id":"main-session"}]',
    });
  });
});
