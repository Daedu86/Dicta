// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMemoryDictaLocalDbAdapter,
  setDictaLocalDbAdapterForTests,
  type DictaLocalDbAdapter,
} from '../src/core/localDb/dictaLocalDb';
import {
  ADAPTIVE_BENCHMARKS_LEGACY_KEY,
  ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY,
  DELETED_SESSION_IDS_LEGACY_KEY,
  DICTA_INDEXEDDB_MIGRATION_MANIFEST_KEY,
  SESSION_STORAGE_LEGACY_KEY,
  migrateLegacyLocalStorageToIndexedDb,
} from '../src/core/localDb/migrateLegacyLocalStorage';
import {
  loadDeletedSessionIds,
  loadSessions,
} from '../src/core/localDb/sessionLocalStore';
import { profileScopedStorageKey } from '../src/core/profileScopedStorage';
import type { SessionTelemetry } from '../src/types/dictation';

type MigratedSession = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  telemetry: SessionTelemetry;
};

const nowMs = Date.parse('2026-06-18T12:00:00.000Z');

beforeEach(() => {
  setDictaLocalDbAdapterForTests(createMemoryDictaLocalDbAdapter());
});

afterEach(() => {
  window.localStorage.clear();
  setDictaLocalDbAdapterForTests(null);
  vi.restoreAllMocks();
});

describe('migrateLegacyLocalStorageToIndexedDb', () => {
  it('migrates legacy sessions, adaptive payloads, and tombstones before deleting legacy keys', async () => {
    window.localStorage.setItem(SESSION_STORAGE_LEGACY_KEY, JSON.stringify([
      session('recent-finished', 'finished', '2026-06-16T00:00:00.000Z'),
      session('old-finished', 'finished', '2026-04-01T00:00:00.000Z'),
      session('old-ready', 'ready', '2026-04-01T00:00:00.000Z'),
    ]));
    window.localStorage.setItem(DELETED_SESSION_IDS_LEGACY_KEY, JSON.stringify(['locally-deleted']));
    window.localStorage.setItem(ADAPTIVE_BENCHMARKS_LEGACY_KEY, JSON.stringify({
      'browser-tts': { de: { sampleCount: 3, lastUpdatedAt: '2026-06-17T00:00:00.000Z' } },
    }));
    window.localStorage.setItem(ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY, JSON.stringify({
      'browser-tts': {
        de: [{ sessionId: 'recent-finished', inputMode: 'browser-tts', language: 'de', completedAt: '2026-06-17T00:00:00.000Z' }],
      },
    }));
    window.localStorage.setItem('dicta.themeMode.v1', 'dark');

    const result = await migrateLegacyLocalStorageToIndexedDb({ profileId: 'profile-a', nowMs });

    expect(result.ok).toBe(true);
    expect((await loadSessions<MigratedSession>('profile-a')).map((item) => item.id)).toEqual([
      'recent-finished',
      'old-ready',
    ]);
    expect([...(await loadDeletedSessionIds('profile-a', nowMs))].sort()).toEqual([
      'locally-deleted',
      'old-finished',
    ]);
    expect(window.localStorage.getItem(SESSION_STORAGE_LEGACY_KEY)).toBeNull();
    expect(window.localStorage.getItem(DELETED_SESSION_IDS_LEGACY_KEY)).toBeNull();
    expect(window.localStorage.getItem(ADAPTIVE_BENCHMARKS_LEGACY_KEY)).toBeNull();
    expect(window.localStorage.getItem(ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY)).toBeNull();
    expect(window.localStorage.getItem('dicta.themeMode.v1')).toBe('dark');
    expect(JSON.parse(window.localStorage.getItem(DICTA_INDEXEDDB_MIGRATION_MANIFEST_KEY) ?? '{}')).toMatchObject({
      version: 1,
      migratedKeys: expect.arrayContaining([
        SESSION_STORAGE_LEGACY_KEY,
        DELETED_SESSION_IDS_LEGACY_KEY,
        ADAPTIVE_BENCHMARKS_LEGACY_KEY,
        ADAPTIVE_SESSION_FEEDBACK_LEGACY_KEY,
      ]),
    });
  });

  it('does not delete legacy keys when IndexedDB persistence fails', async () => {
    const adapter = createMemoryDictaLocalDbAdapter();
    const failingAdapter: DictaLocalDbAdapter = {
      ...adapter,
      replaceSessions: async () => {
        throw new Error('idb failed');
      },
    };
    setDictaLocalDbAdapterForTests(failingAdapter);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.localStorage.setItem(SESSION_STORAGE_LEGACY_KEY, JSON.stringify([
      session('recent-finished', 'finished', '2026-06-16T00:00:00.000Z'),
    ]));

    const result = await migrateLegacyLocalStorageToIndexedDb({ profileId: 'profile-a', nowMs });

    expect(result.ok).toBe(false);
    expect(window.localStorage.getItem(SESSION_STORAGE_LEGACY_KEY)).not.toBeNull();
  });

  it('removes migrated payloads from profile snapshots while preserving small settings', async () => {
    window.localStorage.setItem(profileScopedStorageKey('profile-a'), JSON.stringify({
      [SESSION_STORAGE_LEGACY_KEY]: JSON.stringify([session('profile-session', 'ready', '2026-04-01T00:00:00.000Z')]),
      'dicta.themeMode.v1': 'dark',
    }));

    await migrateLegacyLocalStorageToIndexedDb({ profileId: 'profile-a', nowMs });

    expect((await loadSessions<MigratedSession>('profile-a')).map((item) => item.id)).toEqual(['profile-session']);
    expect(JSON.parse(window.localStorage.getItem(profileScopedStorageKey('profile-a')) ?? '{}')).toEqual({
      'dicta.themeMode.v1': 'dark',
    });
  });
});

function session(id: string, status: string, updatedAt: string): MigratedSession {
  return {
    id,
    status,
    createdAt: updatedAt,
    updatedAt,
    telemetry: {
      startedAt: updatedAt,
      finishedAt: status === 'finished' || status === 'error' ? updatedAt : undefined,
      lagSeries: [],
      wpmSeries: [],
      accuracySeries: [],
      actions: [],
      ttsChunks: [],
      repeatCount: 0,
      rateDistribution: [],
    },
  };
}
