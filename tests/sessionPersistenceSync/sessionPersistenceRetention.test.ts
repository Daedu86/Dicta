// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  SESSION_STORAGE_KEY,
  loadDeletedSessionIds,
} from '../../src/app/useSessionPersistenceSync';
import { PROFILE_SCOPED_STORAGE_MARKER_KEY } from '../../src/core/profileScopedStorage';
import type { DictaSyncRow } from '../../src/core/supabaseSync';
import {
  authSyncConfig,
  createDeferredSupabaseClient,
  flushReactWork,
  renderHarness,
  session,
  telemetry,
  type TestSession,
} from '../helpers/sessionPersistenceSyncHarness';
import { registerSessionPersistenceSyncTestLifecycle } from './sessionPersistenceSyncTestLifecycle';

registerSessionPersistenceSyncTestLifecycle();

const NOW = new Date('2026-06-18T12:00:00.000Z');

function finishedSession(id: string, finishedAt: string): TestSession {
  return {
    ...session(id),
    status: 'finished',
    updatedAt: finishedAt,
    telemetry: {
      ...telemetry(),
      finishedAt,
    },
  };
}

function errorSession(id: string, updatedAt: string): TestSession {
  return {
    ...session(id),
    status: 'error',
    updatedAt,
  };
}

describe('useSessionPersistenceSync session retention', () => {
  it('prunes expired local sessions, keeps pending old sessions, updates active session, and removes feedback', async () => {
    vi.setSystemTime(NOW);
    const expired = finishedSession('expired', '2026-05-01T12:00:00.000Z');
    const retained = finishedSession('retained', '2026-06-15T12:00:00.000Z');
    const oldPending: TestSession = {
      ...session('old-pending'),
      status: 'ready',
      updatedAt: '2026-01-01T12:00:00.000Z',
    };
    window.localStorage.setItem(
      ADAPTIVE_SESSION_FEEDBACK_KEY,
      JSON.stringify({
        'browser-tts': {
          de: [
            { sessionId: 'expired', note: 'remove' },
            { sessionId: 'retained', note: 'keep' },
          ],
        },
      }),
    );

    const { getSessions, getActiveSessionId, getFeedback } = renderHarness({
      initialSessions: [expired, retained, oldPending],
    });
    await flushReactWork();
    await flushReactWork();

    expect(getSessions().map((item) => item.id)).toEqual(['retained', 'old-pending']);
    expect(getActiveSessionId()).toBe('retained');
    expect(loadDeletedSessionIds().has('expired')).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? '[]').map((item: TestSession) => item.id))
      .toEqual(['retained', 'old-pending']);
    expect(getFeedback()).toEqual({
      'browser-tts': {
        de: [{ sessionId: 'retained', note: 'keep' }],
      },
    });
  });

  it('waits for Supabase initial pull before pruning and syncs expired sessions as tombstones', async () => {
    vi.setSystemTime(NOW);
    const expired = errorSession('expired-remote', '2026-05-01T12:00:00.000Z');
    window.localStorage.setItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, 'profile-b');
    const remoteRows: DictaSyncRow[] = [
      {
        profile_id: 'profile-b',
        item_type: 'session',
        item_key: expired.id,
        payload: expired,
        updated_at: expired.updatedAt,
      },
    ];
    const fakeSupabase = createDeferredSupabaseClient(remoteRows);
    const { getRuntime, getSessions } = renderHarness({
      initialSessions: [expired],
      syncConfig: authSyncConfig,
      effectiveProfileId: 'profile-b',
      supabaseClient: fakeSupabase.client,
    });

    expect(getRuntime().supabaseInitialSyncPending).toBe(true);
    expect(getSessions().map((item) => item.id)).toEqual(['expired-remote']);
    expect(fakeSupabase.upsert).not.toHaveBeenCalled();

    await act(async () => {
      fakeSupabase.resolvePull();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushReactWork();
    await flushReactWork();
    await flushReactWork();

    expect(getRuntime().supabaseInitialSyncPending).toBe(false);
    expect(getSessions()).toEqual([]);
    expect(loadDeletedSessionIds().has('expired-remote')).toBe(true);
    expect(
      fakeSupabase.upsert.mock.calls.some(([row]) => {
        const payload = Array.isArray(row) ? row[0]?.payload : row?.payload;
        return payload?.id === 'expired-remote' && payload?.deleted === true;
      }),
    ).toBe(true);
  });

  it('prunes feedback for deleted sessions imported during Supabase pulls', async () => {
    window.localStorage.setItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, 'profile-b');
    const remoteRows: DictaSyncRow[] = [
      {
        profile_id: 'profile-b',
        item_type: 'session',
        item_key: 'deleted-session',
        payload: {
          id: 'deleted-session',
          deleted: true,
          deletedAt: '2026-06-01T12:00:00.000Z',
          updatedAt: '2026-06-01T12:00:00.000Z',
        },
        updated_at: '2026-06-01T12:00:00.000Z',
      },
      {
        profile_id: 'profile-b',
        item_type: 'feedback',
        item_key: 'deleted-session',
        payload: {
          sessionId: 'deleted-session',
          inputMode: 'browser-tts',
          language: 'de',
          createdAt: '2026-06-01T12:00:00.000Z',
          completedAt: '2026-06-01T12:05:00.000Z',
        },
        updated_at: '2026-06-01T12:05:00.000Z',
      },
    ];
    const fakeSupabase = createDeferredSupabaseClient(remoteRows);
    const { getFeedback } = renderHarness({
      initialSessions: [],
      syncConfig: authSyncConfig,
      effectiveProfileId: 'profile-b',
      supabaseClient: fakeSupabase.client,
    });

    await act(async () => {
      fakeSupabase.resolvePull();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushReactWork();
    await flushReactWork();

    expect(loadDeletedSessionIds().has('deleted-session')).toBe(true);
    expect(getFeedback()).toEqual({});
  });
});
