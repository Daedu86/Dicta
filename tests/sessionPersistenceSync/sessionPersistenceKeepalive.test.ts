// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PROFILE_SCOPED_STORAGE_MARKER_KEY } from '../../src/core/profileScopedStorage';
import {
  authSyncConfig,
  createKeepaliveSupabaseClient,
  flushReactWork,
  renderHarness,
  session,
  telemetry,
  type TestSession,
} from '../helpers/sessionPersistenceSyncHarness';
import { registerSessionPersistenceSyncTestLifecycle } from './sessionPersistenceSyncTestLifecycle';

registerSessionPersistenceSyncTestLifecycle();

describe('useSessionPersistenceSync keepalive flush', () => {
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
