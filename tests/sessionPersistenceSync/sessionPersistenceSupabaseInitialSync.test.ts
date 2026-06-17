// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SESSION_STORAGE_KEY, loadDeletedSessionIds } from '../../src/app/useSessionPersistenceSync';
import type { DictaSyncRow } from '../../src/core/supabaseSync';
import { PROFILE_SCOPED_STORAGE_MARKER_KEY } from '../../src/core/profileScopedStorage';
import {
  authSyncConfig,
  createDeferredSupabaseClient,
  flushReactWork,
  renderHarness,
  session,
} from '../helpers/sessionPersistenceSyncHarness';
import { registerSessionPersistenceSyncTestLifecycle } from './sessionPersistenceSyncTestLifecycle';

registerSessionPersistenceSyncTestLifecycle();

describe('useSessionPersistenceSync Supabase initial sync', () => {
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
});
