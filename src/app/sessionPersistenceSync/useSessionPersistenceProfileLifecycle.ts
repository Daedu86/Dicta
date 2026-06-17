import { useProfileScopedSessionStorageSwitch } from './sessionPersistenceProfileSwitch';
import { useSupabaseSyncIdentityReset } from './sessionPersistenceSupabaseReset';
import type { PersistableSession, UseSessionPersistenceSyncOptions } from './sessionPersistenceSyncTypes';
import type { SessionPersistenceCoreRuntime } from './useSessionPersistenceCoreRuntime';

interface UseSessionPersistenceProfileLifecycleOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> {
  options: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>;
  core: SessionPersistenceCoreRuntime<TSession, TBenchmarks, TFeedback>;
}

export function useSessionPersistenceProfileLifecycle<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  options,
  core,
}: UseSessionPersistenceProfileLifecycleOptions<TSession, TBenchmarks, TFeedback>): void {
  const { state, local, syncEnabled, profileId } = core;

  useProfileScopedSessionStorageSwitch({
    authRequired: options.syncConfig.authRequired,
    activeLocalSyncProfileId: state.activeLocalSyncProfileId,
    setActiveLocalSyncProfileId: state.setActiveLocalSyncProfileId,
    effectiveProfileId: options.effectiveProfileId,
    clearScheduledSessionPersist: local.clearScheduledSessionPersist,
    loadSessions: options.loadSessions,
    setSessions: options.setSessions,
    setActiveSessionId: options.setActiveSessionId,
    onProfileStorageSwitched: options.onProfileStorageSwitched,
    loadAdaptiveBenchmarks: options.loadAdaptiveBenchmarks,
    adaptiveBenchmarksRef: options.adaptiveBenchmarksRef,
    setAdaptiveBenchmarks: options.setAdaptiveBenchmarks,
    loadAdaptiveSessionFeedback: options.loadAdaptiveSessionFeedback,
    adaptiveSessionFeedbackRef: options.adaptiveSessionFeedbackRef,
    setAdaptiveSessionFeedback: options.setAdaptiveSessionFeedback,
    deletedSessionIdsRef: state.deletedSessionIdsRef,
    syncStateRef: state.syncStateRef,
    buildSyncState: options.buildSyncState,
    supabaseApplyingRemoteRef: state.supabaseApplyingRemoteRef,
    supabaseInitialPullCompleteRef: state.supabaseInitialPullCompleteRef,
    setSupabaseInitialPullState: state.setSupabaseInitialPullState,
    supabasePullInFlightRef: state.supabasePullInFlightRef,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef: state.supabaseLastRemoteUpdatedAtRef,
    supabaseLastFullPullAtMsRef: state.supabaseLastFullPullAtMsRef,
    pendingCriticalSessionRowsRef: state.pendingCriticalSessionRowsRef,
    latestSessionsForPersistenceRef: state.latestSessionsForPersistenceRef,
    lastPersistedSessionsJsonRef: state.lastPersistedSessionsJsonRef,
  });

  useSupabaseSyncIdentityReset({
    syncEnabled,
    profileId,
    supabaseSyncIdentity: state.supabaseSyncIdentity,
    authRequired: options.syncConfig.authRequired,
    profileDisplayName: options.profileDisplayName,
    supabaseInitialPullCompleteRef: state.supabaseInitialPullCompleteRef,
    setSupabaseInitialPullState: state.setSupabaseInitialPullState,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef: state.supabaseLastRemoteUpdatedAtRef,
    supabaseLastFullPullAtMsRef: state.supabaseLastFullPullAtMsRef,
    pendingCriticalSessionRowsRef: state.pendingCriticalSessionRowsRef,
    setSupabaseSyncStatus: state.setSupabaseSyncStatus,
  });
}
