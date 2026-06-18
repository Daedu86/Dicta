import { useSupabaseBackgroundPush } from './sessionPersistenceSupabasePush';
import { useSessionLocalPayloadHydration } from './sessionPersistenceLocalPayloadHydration';
import { useSessionPersistenceLocalLifecycleEffects } from './sessionPersistenceLocalLifecycleEffects';
import { useSessionRetentionPruning } from './sessionPersistenceRetentionPruning';
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

  useSessionLocalPayloadHydration({
    localPayloadStore: options.localPayloadStore,
    profileStorageReadyForEffectiveProfile: state.profileStorageReadyForEffectiveProfile,
    localPayloadProfileId: state.localPayloadProfileId,
    localPayloadReadyForEffectiveProfile: state.localPayloadReadyForEffectiveProfile,
    setLocalPayloadReadyProfileId: state.setLocalPayloadReadyProfileId,
    setSessions: options.setSessions,
    setActiveSessionId: options.setActiveSessionId,
    setAdaptiveBenchmarks: options.setAdaptiveBenchmarks,
    adaptiveBenchmarksRef: options.adaptiveBenchmarksRef,
    setAdaptiveSessionFeedback: options.setAdaptiveSessionFeedback,
    adaptiveSessionFeedbackRef: options.adaptiveSessionFeedbackRef,
    deletedSessionIdsRef: state.deletedSessionIdsRef,
    syncStateRef: state.syncStateRef,
    latestSessionsForPersistenceRef: state.latestSessionsForPersistenceRef,
    pendingHydratedSessionsRef: state.pendingHydratedSessionsRef,
    lastPersistedSessionsJsonRef: state.lastPersistedSessionsJsonRef,
    supabaseApplyingRemoteRef: state.supabaseApplyingRemoteRef,
    supabaseInitialPullCompleteRef: state.supabaseInitialPullCompleteRef,
    setSupabaseInitialPullState: state.setSupabaseInitialPullState,
    buildSyncState: options.buildSyncState,
    normalizeRestoredSession: options.normalizeRestoredSession,
    loadSessionsFallback: options.loadSessions,
    loadAdaptiveBenchmarksFallback: options.loadAdaptiveBenchmarks,
    loadAdaptiveSessionFeedbackFallback: options.loadAdaptiveSessionFeedback,
  });

  useSessionPersistenceLocalLifecycleEffects({
    sessions: options.sessions,
    localStorageReadyForEffectiveProfile: state.localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending: state.supabaseInitialSyncPending,
    latestSessionsForPersistenceRef: state.latestSessionsForPersistenceRef,
    pendingHydratedSessionsRef: state.pendingHydratedSessionsRef,
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
    localPayloadProfileId: state.localPayloadProfileId,
    localPayloadStore: options.localPayloadStore,
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
    pruneAdaptiveSessionFeedbackForDeletedSessions: options.pruneAdaptiveSessionFeedbackForDeletedSessions,
  });

  useSessionRetentionPruning({
    sessions: options.sessions,
    setSessions: options.setSessions,
    activeSessionId: options.activeSessionId,
    setActiveSessionId: options.setActiveSessionId,
    adaptiveBenchmarks: options.adaptiveBenchmarks,
    adaptiveSessionFeedback: options.adaptiveSessionFeedback,
    setAdaptiveSessionFeedback: options.setAdaptiveSessionFeedback,
    adaptiveSessionFeedbackRef: options.adaptiveSessionFeedbackRef,
    pruneAdaptiveSessionFeedbackForDeletedSessions: options.pruneAdaptiveSessionFeedbackForDeletedSessions,
    buildSyncState: options.buildSyncState,
    syncStateRef: state.syncStateRef,
    latestSessionsForPersistenceRef: state.latestSessionsForPersistenceRef,
    deletedSessionIdsRef: state.deletedSessionIdsRef,
    localStorageReadyForEffectiveProfile: state.localStorageReadyForEffectiveProfile,
    syncEnabled,
    supabaseClient: options.supabaseClient,
    profileId,
    supabaseInitialPullCompleteRef: state.supabaseInitialPullCompleteRef,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef: state.supabaseLastRemoteUpdatedAtRef,
    clearScheduledSessionPersist: local.clearScheduledSessionPersist,
    persistSessionsToLocalStorage: local.persistSessionsToLocalStorage,
    localPayloadProfileId: state.localPayloadProfileId,
    localPayloadStore: options.localPayloadStore,
    setSupabaseSyncStatus: state.setSupabaseSyncStatus,
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
