// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  ADAPTIVE_BENCHMARKS_KEY,
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  SESSION_STORAGE_KEY,
  loadDeletedSessionIds,
} from '../../src/app/useSessionPersistenceSync';
import {
  PROFILE_SCOPED_STORAGE_MARKER_KEY,
  profileScopedStorageKey,
} from '../../src/core/profileScopedStorage';
import {
  authSyncConfig,
  flushReactWork,
  renderHarness,
  session,
} from '../helpers/sessionPersistenceSyncHarness';
import { registerSessionPersistenceSyncTestLifecycle } from './sessionPersistenceSyncTestLifecycle';

registerSessionPersistenceSyncTestLifecycle();

describe('useSessionPersistenceSync local persistence', () => {
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
});
