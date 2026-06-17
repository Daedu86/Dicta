import { useSupabaseBackgroundPush } from './sessionPersistenceSupabasePush';
import { useSessionLocalPersistence } from './sessionPersistenceLocalStorage';
import { usePendingCriticalSessionRowsRuntime } from './sessionPersistencePendingCriticalRuntime';
import { useProfileScopedSessionStorageSwitch } from './sessionPersistenceProfileSwitch';
import { useSupabaseSessionPullRuntime } from './sessionPersistenceSupabasePull';
import { useSupabaseSyncIdentityReset } from './sessionPersistenceSupabaseReset';
import { useSessionPersistenceRuntimeState } from './sessionPersistenceSyncRuntimeState';
import { useSessionPersistenceSyncActions } from './sessionPersistenceSyncActions';
import { useSessionPersistenceLocalLifecycleEffects } from './sessionPersistenceLocalLifecycleEffects';
import {
  useSessionPersistenceSyncStateRef,
  useSupabaseInitialSyncPendingRef,
} from './sessionPersistenceRuntimeSyncStateEffects';
import type {
  PersistableSession,
  UseSessionPersistenceSyncOptions,
  UseSessionPersistenceSyncResult,
} from './sessionPersistenceSyncTypes';

export function useSessionPersistenceSync<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  sessions,
  setSessions,
  activeSessionId,
  setActiveSessionId,
  syncConfig,
  supabaseClient,
  effectiveProfileId,
  profileDisplayName,
  adaptiveBenchmarks,
  setAdaptiveBenchmarks,
  adaptiveBenchmarksRef,
  adaptiveSessionFeedback,
  setAdaptiveSessionFeedback,
  adaptiveSessionFeedbackRef,
  loadSessions,
  loadAdaptiveBenchmarks,
  loadAdaptiveSessionFeedback,
  normalizeSessionForPersistence,
  normalizeRestoredSession,
  buildSyncState,
  onQuotaRecovered,
  onProfileStorageSwitched,
}: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>): UseSessionPersistenceSyncResult<TSession, TFeedback> {
  const state = useSessionPersistenceRuntimeState({
    sessions,
    syncConfig,
    supabaseClient,
    effectiveProfileId,
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    buildSyncState,
  });
  const syncEnabled = state.effectiveSyncConfig.enabled;
  const profileId = state.effectiveSyncConfig.profileId;

  useSupabaseInitialSyncPendingRef(state.supabaseInitialSyncPending, state.supabaseInitialSyncPendingRef);

  const local = useSessionLocalPersistence({
    activeSessionId,
    latestSessionsForPersistenceRef: state.latestSessionsForPersistenceRef,
    sessionPersistTimerRef: state.sessionPersistTimerRef,
    lastPersistedSessionsJsonRef: state.lastPersistedSessionsJsonRef,
    supabaseInitialSyncPendingRef: state.supabaseInitialSyncPendingRef,
    normalizeSessionForPersistence,
    onQuotaRecovered,
  });

  const pending = usePendingCriticalSessionRowsRuntime({
    effectiveSyncConfig: state.effectiveSyncConfig,
    supabaseAccessTokenRef: state.supabaseAccessTokenRef,
    pendingCriticalSessionRowsRef: state.pendingCriticalSessionRowsRef,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
  });

  const actions = useSessionPersistenceSyncActions({
    supabaseClient,
    syncEnabled,
    profileId,
    setSessions,
    adaptiveBenchmarks,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedback,
    adaptiveSessionFeedbackRef,
    buildSyncState,
    latestSessionsForPersistenceRef: state.latestSessionsForPersistenceRef,
    clearScheduledSessionPersist: local.clearScheduledSessionPersist,
    persistSessionsToLocalStorage: local.persistSessionsToLocalStorage,
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

  useProfileScopedSessionStorageSwitch({
    authRequired: syncConfig.authRequired,
    activeLocalSyncProfileId: state.activeLocalSyncProfileId,
    setActiveLocalSyncProfileId: state.setActiveLocalSyncProfileId,
    effectiveProfileId,
    clearScheduledSessionPersist: local.clearScheduledSessionPersist,
    loadSessions,
    setSessions,
    setActiveSessionId,
    onProfileStorageSwitched,
    loadAdaptiveBenchmarks,
    adaptiveBenchmarksRef,
    setAdaptiveBenchmarks,
    loadAdaptiveSessionFeedback,
    adaptiveSessionFeedbackRef,
    setAdaptiveSessionFeedback,
    deletedSessionIdsRef: state.deletedSessionIdsRef,
    syncStateRef: state.syncStateRef,
    buildSyncState,
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
    authRequired: syncConfig.authRequired,
    profileDisplayName,
    supabaseInitialPullCompleteRef: state.supabaseInitialPullCompleteRef,
    setSupabaseInitialPullState: state.setSupabaseInitialPullState,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef: state.supabaseLastRemoteUpdatedAtRef,
    supabaseLastFullPullAtMsRef: state.supabaseLastFullPullAtMsRef,
    pendingCriticalSessionRowsRef: state.pendingCriticalSessionRowsRef,
    setSupabaseSyncStatus: state.setSupabaseSyncStatus,
  });

  useSessionPersistenceLocalLifecycleEffects({
    sessions,
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
    sessions,
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    buildSyncState,
    syncStateRef: state.syncStateRef,
  });

  useSupabaseSessionPullRuntime({
    supabaseClient,
    syncEnabled,
    profileId,
    supabaseSyncIdentity: state.supabaseSyncIdentity,
    normalizeRestoredSession,
    setSessions,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
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
    supabaseClient,
    syncEnabled,
    profileId,
    sessions,
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    buildSyncState,
    supabaseInitialPullCompleteRef: state.supabaseInitialPullCompleteRef,
    supabaseApplyingRemoteRef: state.supabaseApplyingRemoteRef,
    supabaseKnownRemoteRowsRef: state.supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef: state.supabaseLastRemoteUpdatedAtRef,
    clearPendingCriticalSessionRows: pending.clearPendingCriticalSessionRows,
    setSupabaseSyncStatus: state.setSupabaseSyncStatus,
  });

  return {
    localStorageReadyForEffectiveProfile: state.localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending: state.supabaseInitialSyncPending,
    effectiveSyncConfig: state.effectiveSyncConfig,
    supabaseSyncStatus: state.supabaseSyncStatus,
    flushScheduledSessionPersist: local.flushScheduledSessionPersist,
    ...actions,
  };
}
