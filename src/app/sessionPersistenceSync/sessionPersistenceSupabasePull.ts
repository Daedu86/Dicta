import { useEffect } from 'react';
import { SUPABASE_BACKGROUND_PULL_INTERVAL_MS } from './sessionPersistenceSyncConstants';
import type { PersistableSession } from './sessionPersistenceSyncTypes';
import type { UseSupabaseSessionPullRuntimeOptions } from './sessionPersistenceSupabasePullTypes';
import { createSupabasePullSync } from './sessionPersistenceSupabasePullSync';

export type { UseSupabaseSessionPullRuntimeOptions } from './sessionPersistenceSupabasePullTypes';

export function useSupabaseSessionPullRuntime<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  options: UseSupabaseSessionPullRuntimeOptions<TSession, TBenchmarks, TFeedback>,
): void {
  const {
    supabaseClient,
    syncEnabled,
    profileId,
    localPayloadProfileId,
    localPayloadStore,
    supabaseSyncIdentity,
    normalizeRestoredSession,
    setSessions,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
    setSupabaseSyncStatus,
    setSupabaseInitialPullState,
    syncStateRef,
    deletedSessionIdsRef,
    supabasePullInFlightRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    supabaseLastFullPullAtMsRef,
    supabaseApplyingRemoteRef,
    supabaseInitialPullCompleteRef,
    clearPendingCriticalSessionRows,
    pruneAdaptiveSessionFeedbackForDeletedSessions,
  } = options;

  useEffect(() => {
    if (!supabaseClient || !syncEnabled) return;
    const client = supabaseClient;
    let cancelled = false;
    const pullAndMergeSync = createSupabasePullSync({
      client,
      profileId,
      localPayloadProfileId,
      localPayloadStore,
      supabaseSyncIdentity,
      normalizeRestoredSession,
      setSessions,
      setAdaptiveBenchmarks,
      setAdaptiveSessionFeedback,
      setSupabaseSyncStatus,
      setSupabaseInitialPullState,
      syncStateRef,
      deletedSessionIdsRef,
      supabasePullInFlightRef,
      supabaseKnownRemoteRowsRef,
      supabaseLastRemoteUpdatedAtRef,
      supabaseLastFullPullAtMsRef,
      supabaseApplyingRemoteRef,
      supabaseInitialPullCompleteRef,
      clearPendingCriticalSessionRows,
      pruneAdaptiveSessionFeedbackForDeletedSessions,
      isCancelled: () => cancelled,
    });

    void pullAndMergeSync('initial');
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void pullAndMergeSync('background');
    }, SUPABASE_BACKGROUND_PULL_INTERVAL_MS);

    const onFocus = () => void pullAndMergeSync('background');
    const onOnline = () => void pullAndMergeSync('background');
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void pullAndMergeSync('background');
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [
    clearPendingCriticalSessionRows,
    deletedSessionIdsRef,
    normalizeRestoredSession,
    profileId,
    localPayloadProfileId,
    localPayloadStore,
    pruneAdaptiveSessionFeedbackForDeletedSessions,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
    setSessions,
    setSupabaseInitialPullState,
    setSupabaseSyncStatus,
    supabaseApplyingRemoteRef,
    supabaseClient,
    supabaseInitialPullCompleteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastFullPullAtMsRef,
    supabaseLastRemoteUpdatedAtRef,
    supabasePullInFlightRef,
    supabaseSyncIdentity,
    syncEnabled,
    syncStateRef,
  ]);
}
