// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createIndexedDbLocalPayloadStore,
  LOCAL_ONLY_LOCAL_DB_PROFILE_ID,
} from '../../src/app/sessionPersistenceSync/sessionPersistenceLocalPayloadStore';
import { SESSION_STORAGE_KEY } from '../../src/app/useSessionPersistenceSync';
import {
  createMemoryDictaLocalDbAdapter,
  setDictaLocalDbAdapterForTests,
  type DictaLocalDbAdapter,
} from '../../src/core/localDb/dictaLocalDb';
import { loadSessions, saveSessions } from '../../src/core/localDb/sessionLocalStore';
import {
  flushReactWork,
  renderHarness,
  session,
} from '../helpers/sessionPersistenceSyncHarness';
import { registerSessionPersistenceSyncTestLifecycle } from './sessionPersistenceSyncTestLifecycle';

registerSessionPersistenceSyncTestLifecycle();

let adapter: DictaLocalDbAdapter;

beforeEach(() => {
  adapter = createMemoryDictaLocalDbAdapter();
  setDictaLocalDbAdapterForTests(adapter);
});

afterEach(() => {
  setDictaLocalDbAdapterForTests(null);
});

describe('useSessionPersistenceSync IndexedDB local store', () => {
  it('hydrates sessions from IndexedDB without requiring dicta.sessions.v1', async () => {
    const storedSession = session('idb-session');
    const replaceSpy = vi.spyOn(adapter, 'replaceSessions');
    await saveSessions(LOCAL_ONLY_LOCAL_DB_PROFILE_ID, [storedSession]);
    expect(await loadSessions(LOCAL_ONLY_LOCAL_DB_PROFILE_ID)).toEqual([storedSession]);
    expect(replaceSpy.mock.calls.map((call) => call[1].map((record) => record.payload))).toEqual([[storedSession]]);
    const localPayloadStore = createIndexedDbLocalPayloadStore();
    await expect(localPayloadStore.migrateAndLoad(LOCAL_ONLY_LOCAL_DB_PROFILE_ID)).resolves.toMatchObject({
      sessions: [storedSession],
    });

    const { getSessions, getRuntime } = renderHarness({
      initialSessions: [],
      localPayloadStore,
    });
    await flushReactWork();
    await flushReactWork();

    expect(getRuntime().localStorageReadyForEffectiveProfile).toBe(true);
    expect(replaceSpy.mock.calls.map((call) => call[1].map((record) => record.payload))).toEqual([[storedSession]]);
    expect(await loadSessions(LOCAL_ONLY_LOCAL_DB_PROFILE_ID)).toEqual([storedSession]);
    expect(getSessions()).toEqual([storedSession]);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('persists session snapshots to IndexedDB instead of dicta.sessions.v1', async () => {
    const firstSession = session('first');
    const nextSession = session('next');
    const { getRuntime } = renderHarness({
      initialSessions: [],
      localPayloadStore: createIndexedDbLocalPayloadStore(),
    });
    await flushReactWork();
    await flushReactWork();

    act(() => {
      getRuntime().persistAndPushSessionsNow([firstSession, nextSession]);
    });
    await flushReactWork();
    await flushReactWork();

    expect((await loadSessions(LOCAL_ONLY_LOCAL_DB_PROFILE_ID)).map((item) => item.id)).toEqual([
      'first',
      'next',
    ]);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
