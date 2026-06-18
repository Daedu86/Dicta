import { useSessionLocalPersistence } from './sessionPersistenceLocalStorage';
import { usePendingCriticalSessionRowsRuntime } from './sessionPersistencePendingCriticalRuntime';
import { useSessionPersistenceRuntimeState } from './sessionPersistenceSyncRuntimeState';
import { useSessionPersistenceSyncActions } from './sessionPersistenceSyncActions';
import { useSupabaseInitialSyncPendingRef } from './sessionPersistenceRuntimeSyncStateEffects';
import type { PersistableSession, UseSessionPersistenceSyncOptions } from './sessionPersistenceSyncTypes';

export function useSessionPersistenceCoreRuntime<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  options: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>,
) {
  const state = useSessionPersistenceRuntimeState({
    sessions: options.sessions,
    syncConfig: options.syncConfig,
    supabaseClient: options.supabaseClient,
    effectiveProfileId: options.effectiveProfileId,
    adaptiveBenchmarks: options.adaptiveBenchmarks,
    adaptiveSessionFeedback: options.adaptiveSessionFeedback,
    buildSyncState: options.buildSyncState,
    localPayloadStore: options.localPayloadStore,
  });
  const syncEnabled = state.effectiveSyncConfig.enabled;
  const profileId = state.effectiveSyncConfig.profileId;

  useSupabaseInitialSyncPendingRef(state.supabaseInitialSyncPending, state.supabaseInitialSyncPendingRef);

  const local = useSessionLocalPersistence({
    activeSessionId: options.activeSessionId,
    latestSessionsForPersistenceRef: state.latestSessionsForPersistenceRef,
    sessionPersistTimerRef: state.sessionPersistTimerRef,
    lastPersistedSessionsJsonRef: state.lastPersistedSessionsJsonRef,
    supabaseInitialSyncPendingRef: state.supabaseInitialSyncPendingRef,
    localPayloadProfileId: state.localPayloadProfileId,
    localPayloadStore: options.localPayloadStore,
    normalizeSessionForPersistence: options.normalizeSessionForPersistence,
    onQuotaRecovered: options.onQuotaRecovered,
  });

  const pending = usePendingCriticalSessionRowsRuntime({
    effectiveSyncConfig: state.effectiveSyncConfig,
    supabaseAccessTokenRef: state.supabaseAccessTokenRef,
    pendingCriticalSessionRowsRef: state.pendingCriticalSessionRowsRef,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
  });

  const actions = useSessionPersistenceSyncActions({
    supabaseClient: options.supabaseClient,
    syncEnabled,
    profileId,
    setSessions: options.setSessions,
    adaptiveBenchmarks: options.adaptiveBenchmarks,
    adaptiveBenchmarksRef: options.adaptiveBenchmarksRef,
    adaptiveSessionFeedback: options.adaptiveSessionFeedback,
    adaptiveSessionFeedbackRef: options.adaptiveSessionFeedbackRef,
    buildSyncState: options.buildSyncState,
    latestSessionsForPersistenceRef: state.latestSessionsForPersistenceRef,
    clearScheduledSessionPersist: local.clearScheduledSessionPersist,
    persistSessionsToLocalStorage: local.persistSessionsToLocalStorage,
    localPayloadProfileId: state.localPayloadProfileId,
    localPayloadStore: options.localPayloadStore,
    syncStateRef: state.syncStateRef,
    supabaseInitialPullCompleteRef: state.supabaseInitialPullCompleteRef,
    supabaseApplyingRemoteRef: state.supabaseApplyingRemoteRef,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef: state.supabaseLastRemoteUpdatedAtRef,
    deletedSessionIdsRef: state.deletedSessionIdsRef,
    setSupabaseSyncStatus: state.setSupabaseSyncStatus,
    rememberPendingCriticalSessionRows: pending.rememberPendingCriticalSessionRows,
    clearPendingCriticalSessionRows: pending.clearPendingCriticalSessionRows,
  });

  return {
    state,
    local,
    pending,
    actions,
    syncEnabled,
    profileId,
  };
}

export type SessionPersistenceCoreRuntime<TSession extends PersistableSession, TBenchmarks, TFeedback> = ReturnType<
  typeof useSessionPersistenceCoreRuntime<TSession, TBenchmarks, TFeedback>
>;
