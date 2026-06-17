import { useSupabaseBackgroundPush } from './sessionPersistenceSupabasePush';
import { useSessionPersistenceLocalLifecycleEffects } from './sessionPersistenceLocalLifecycleEffects';
import { useSupabaseSessionPullRuntime } from './sessionPersistenceSupabasePull';
import { useSessionPersistenceSyncStateRef } from './sessionPersistenceRuntimeSyncStateEffects';
import type { PersistableSession, UseSessionPersistenceSyncOptions } from './sessionPersistenceSyncTypes';
import type { SessionPersistenceCoreRuntime } from './useSessionPersistenceCoreRuntime';

interface UseSessionPersistenceDataLifecycleOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> {
  options: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>;
  core: SessionPersistenceCoreRuntime<TSession, TBenchmarks, TFeedback>;
}

export function useSessionPersistenceDataLifecycle<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  options,
  core,
}: UseSessionPersistenceDataLifecycleOptions<TSession, TBenchmarks, TFeedback>): void {
  const { state, local, pending, syncEnabled, profileId } = core;

  useSessionPersistenceLocalLifecycleEffects({
    sessions: options.sessions,
    localStorageReadyForEffectiveProfile: state.localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending: state.supabaseInitialSyncPending,
    latestSessionsForPersistenceRef: state.latestSessionsForPersistenceRef,
    sessionPersistTimerRef: state.sessionPersistTimerRef,
    clearScheduledSessionPersist: local.clearScheduledSessionPersist,
    persistSessionsToLocalStorage: local.persistSessionsToLocalStorage,
    flushScheduledSessionPersist: local.flushScheduledSessionPersist,
    flushPendingCriticalSessionRowsKeepalive: pending.flushPendingCriticalSessionRowsKeepalive,
  });

  useSessionPersistenceSyncStateRef({
    sessions: options.sessions,
    adaptiveBenchmarks: options.adaptiveBenchmarks,
    adaptiveSessionFeedback: options.adaptiveSessionFeedback,
    buildSyncState: options.buildSyncState,
    syncStateRef: state.syncStateRef,
  });

  useSupabaseSessionPullRuntime({
    supabaseClient: options.supabaseClient,
    syncEnabled,
    profileId,
    supabaseSyncIdentity: state.supabaseSyncIdentity,
    normalizeRestoredSession: options.normalizeRestoredSession,
    setSessions: options.setSessions,
    setAdaptiveBenchmarks: options.setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback: options.setAdaptiveSessionFeedback,
    setSupabaseSyncStatus: state.setSupabaseSyncStatus,
    setSupabaseInitialPullState: state.setSupabaseInitialPullState,
    syncStateRef: state.syncStateRef,
    deletedSessionIdsRef: state.deletedSessionIdsRef,
    supabasePullInFlightRef: state.supabasePullInFlightRef,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef: state.supabaseLastRemoteUpdatedAtRef,
    supabaseLastFullPullAtMsRef: state.supabaseLastFullPullAtMsRef,
    supabaseApplyingRemoteRef: state.supabaseApplyingRemoteRef,
    supabaseInitialPullCompleteRef: state.supabaseInitialPullCompleteRef,
    clearPendingCriticalSessionRows: pending.clearPendingCriticalSessionRows,
  });

  useSupabaseBackgroundPush({
    supabaseClient: options.supabaseClient,
    syncEnabled,
    profileId,
    sessions: options.sessions,
    adaptiveBenchmarks: options.adaptiveBenchmarks,
    adaptiveSessionFeedback: options.adaptiveSessionFeedback,
    buildSyncState: options.buildSyncState,
    supabaseInitialPullCompleteRef: state.supabaseInitialPullCompleteRef,
    supabaseApplyingRemoteRef: state.supabaseApplyingRemoteRef,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef: state.supabaseLastRemoteUpdatedAtRef,
    clearPendingCriticalSessionRows: pending.clearPendingCriticalSessionRows,
    setSupabaseSyncStatus: state.setSupabaseSyncStatus,
  });
}
