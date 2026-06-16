// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADAPTIVE_BENCHMARKS_KEY,
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  SESSION_STORAGE_KEY,
  loadDeletedSessionIds,
} from '../src/app/useSessionPersistenceSync';
import type { DictaSyncRow } from '../src/core/supabaseSync';
import {
  PROFILE_SCOPED_STORAGE_MARKER_KEY,
  profileScopedStorageKey,
} from '../src/core/profileScopedStorage';
import {
  authSyncConfig,
  cleanupSessionPersistenceSyncHarness,
  createDeferredSupabaseClient,
  createKeepaliveSupabaseClient,
  flushReactWork,
  renderHarness,
  session,
  setupSessionPersistenceSyncHarness,
  telemetry,
  type TestSession,
} from './helpers/sessionPersistenceSyncHarness';

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  setupSessionPersistenceSyncHarness();
});

afterEach(() => {
  cleanupSessionPersistenceSyncHarness();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useSessionPersistenceSync', () => {
  it('schedules debounced normal session writes and persists immediately on final paths', () => {
    const firstSession = session('s1');
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const { getRuntime } = renderHarness({ initialSessions: [firstSession] });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1500);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? '[]')).toEqual([firstSession]);

    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    const finalSession = session('s2');
    act(() => {
      getRuntime().persistAndPushSessionsNow([finalSession]);
    });
    expect(JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? '[]')).toEqual([finalSession]);
  });

  it('switches profile-scoped storage before marking localStorage ready', async () => {
    const oldSession = session('old', 'old-profile');
    const newSession = session('new', 'new-profile');
    window.localStorage.setItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, 'profile-a');
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([oldSession]));
    window.localStorage.setItem(
      profileScopedStorageKey('profile-b'),
      JSON.stringify({
        [SESSION_STORAGE_KEY]: JSON.stringify([newSession]),
        [ADAPTIVE_BENCHMARKS_KEY]: JSON.stringify({ input2: { de: { marker: 'bench-b' } } }),
        [ADAPTIVE_SESSION_FEEDBACK_KEY]: JSON.stringify({ input2: { de: [] } }),
      }),
    );
    const onProfileStorageSwitched = vi.fn();

    const { getRuntime, getSessions, getActiveSessionId } = renderHarness({
      initialSessions: [oldSession],
      syncConfig: authSyncConfig,
      effectiveProfileId: 'profile-b',
      onProfileStorageSwitched,
    });
    await flushReactWork();

    expect(getRuntime().localStorageReadyForEffectiveProfile).toBe(true);
    expect(getSessions()).toEqual([newSession]);
    expect(getActiveSessionId()).toBe('new');
    expect(onProfileStorageSwitched).toHaveBeenCalledTimes(1);
  });

  it('persists local tombstones when deleting sessions', async () => {
    const firstSession = session('s1');
    const secondSession = session('s2');
    const { getRuntime, getSessions } = renderHarness({ initialSessions: [firstSession, secondSession] });

    act(() => {
      getRuntime().deleteSessionAndSync('s1');
    });
    await flushReactWork();

    expect(getSessions()).toEqual([secondSession]);
    expect(loadDeletedSessionIds().has('s1')).toBe(true);
  });

  it('keeps Supabase initial sync pending until remote tombstones are applied', async () => {
    vi.useRealTimers();
    const staleSession = session('stale', 'stale-local');
    const remoteSession = {
      ...session('remote', 'remote-current'),
      updatedAt: '2026-06-05T12:00:00.000Z',
    };
    window.localStorage.setItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, 'profile-b');
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([staleSession]));
    const remoteRows: DictaSyncRow[] = [
      {
        profile_id: 'profile-b',
        item_type: 'session',
        item_key: 'stale',
        payload: {
          id: 'stale',
          deleted: true,
          deletedAt: '2026-06-05T11:00:00.000Z',
          updatedAt: '2026-06-05T11:00:00.000Z',
        },
        updated_at: '2026-06-05T11:00:00.000Z',
      },
      {
        profile_id: 'profile-b',
        item_type: 'session',
        item_key: 'remote',
        payload: remoteSession,
        updated_at: remoteSession.updatedAt,
      },
    ];

    const fakeSupabase = createDeferredSupabaseClient(remoteRows);
    const { getRuntime, getSessions } = renderHarness({
      initialSessions: [staleSession],
      syncConfig: authSyncConfig,
      effectiveProfileId: 'profile-b',
      supabaseClient: fakeSupabase.client,
    });

    expect(getRuntime().supabaseInitialSyncPending).toBe(true);
    await act(async () => {
      fakeSupabase.resolvePull();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushReactWork();
    await flushReactWork();
    await flushReactWork();

    expect(getRuntime().supabaseInitialSyncPending).toBe(false);
    expect(getSessions()).toEqual([remoteSession]);
    expect(loadDeletedSessionIds().has('stale')).toBe(true);
  });

  it('repairs a pending session during initial sync when Supabase has completed feedback', async () => {
    vi.useRealTimers();
    const pendingSession = session('s1', 'local-pending');
    const completedAt = '2026-06-05T12:08:00.000Z';
    window.localStorage.setItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, 'profile-b');
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([pendingSession]));
    const remoteRows: DictaSyncRow[] = [
      {
        profile_id: 'profile-b',
        item_type: 'session',
        item_key: 's1',
        payload: {
          ...pendingSession,
          marker: 'remote-pending',
          updatedAt: '2026-06-05T12:00:00.000Z',
        },
        updated_at: '2026-06-05T12:00:00.000Z',
      },
      {
        profile_id: 'profile-b',
        item_type: 'feedback',
        item_key: 's1',
        payload: {
          sessionId: 's1',
          inputMode: 'browser-tts',
          language: 'de',
          createdAt: pendingSession.updatedAt,
          completedAt,
        },
        updated_at: completedAt,
      },
    ];
    const fakeSupabase = createDeferredSupabaseClient(remoteRows);
    const { getRuntime, getSessions } = renderHarness({
      initialSessions: [pendingSession],
      syncConfig: authSyncConfig,
      effectiveProfileId: 'profile-b',
      supabaseClient: fakeSupabase.client,
    });

    expect(getRuntime().supabaseInitialSyncPending).toBe(true);
    await act(async () => {
      fakeSupabase.resolvePull();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushReactWork();
    await flushReactWork();

    expect(getRuntime().supabaseInitialSyncPending).toBe(false);
    expect(getSessions()).toEqual([
      expect.objectContaining({
        id: 's1',
        status: 'finished',
        updatedAt: completedAt,
        telemetry: expect.objectContaining({
          finishedAt: completedAt,
        }),
      }),
    ]);
  });

  it('flushes critical finished session rows with keepalive when the page exits before Supabase push resolves', async () => {
    const firstSession = session('s1');
    window.localStorage.setItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, 'profile-b');
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchSpy);
    const { getRuntime } = renderHarness({
      initialSessions: [firstSession],
      syncConfig: authSyncConfig,
      effectiveProfileId: 'profile-b',
      supabaseClient: createKeepaliveSupabaseClient(),
    });
    await flushReactWork();
    await flushReactWork();

    const finishedSession: TestSession = {
      ...firstSession,
      status: 'finished',
      updatedAt: '2026-06-04T12:03:00.000Z',
      telemetry: {
        ...telemetry(),
        startedAt: '2026-06-04T12:00:00.000Z',
        finishedAt: '2026-06-04T12:03:00.000Z',
      },
    };
    act(() => {
      getRuntime().persistAndPushSessionsNow([finishedSession], { criticalSessionIds: ['s1'] });
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(fetchSpy).toHaveBeenCalled();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.supabase.co/rest/v1/dicta_sync_items?on_conflict=profile_id,item_type,item_key');
    expect(init.keepalive).toBe(true);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Prefer: 'resolution=merge-duplicates,return=minimal',
    });
    expect(init.headers).toHaveProperty('Authorization');
    expect(init.headers).toHaveProperty(['api', 'key'].join(''));
    expect(JSON.parse(String(init.body))).toMatchObject([
      {
        profile_id: 'profile-b',
        item_type: 'session',
        item_key: 's1',
        payload: {
          id: 's1',
          status: 'finished',
          telemetry: {
            finishedAt: '2026-06-04T12:03:00.000Z',
          },
        },
      },
    ]);
  });
});
