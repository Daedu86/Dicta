import { useEffect, useMemo, useRef, useState } from 'react';
import { readActiveSyncStorageProfileId } from '../../core/profileScopedStorage';
import type { DictaSyncRow, DictaSyncState } from '../../core/supabaseSync';
import { loadDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import { useSupabaseBackgroundPush } from './sessionPersistenceSupabasePush';
import {
  useDebouncedSessionLocalPersistence,
  useSessionLocalPersistence,
} from './sessionPersistenceLocalStorage';
import { usePendingCriticalSessionRowsRuntime } from './sessionPersistencePendingCriticalRuntime';
import { useProfileScopedSessionStorageSwitch } from './sessionPersistenceProfileSwitch';
import { useSessionPersistenceExitFlush } from './sessionPersistenceLifecycle';
import { useSupabaseAccessTokenRef } from './sessionPersistenceSupabaseAccessToken';
import { useSupabaseSessionPullRuntime } from './sessionPersistenceSupabasePull';
import { useSupabaseSyncIdentityReset } from './sessionPersistenceSupabaseReset';
import { useSessionPersistenceSyncActions } from './sessionPersistenceSyncActions';
import type {
  PersistableSession,
  SupabaseInitialPullState,
  SupabaseSyncStatus,
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
  const [activeLocalSyncProfileId, setActiveLocalSyncProfileId] = useState(() =>
    readActiveSyncStorageProfileId(window.localStorage),
  );
  const localStorageReadyForEffectiveProfile =
    !syncConfig.authRequired || !effectiveProfileId || activeLocalSyncProfileId === effectiveProfileId;
  const effectiveSyncConfig = useMemo(
    () => ({
      ...syncConfig,
      enabled: Boolean(syncConfig.url && syncConfig.anonKey && effectiveProfileId && localStorageReadyForEffectiveProfile),
      profileId: effectiveProfileId,
    }),
    [syncConfig, effectiveProfileId, localStorageReadyForEffectiveProfile],
  );
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<SupabaseSyncStatus>({
    enabled: effectiveSyncConfig.enabled,
    state: effectiveSyncConfig.enabled ? 'idle' : 'disabled',
    message: effectiveSyncConfig.enabled ? 'Supabase sync ready.' : 'Sign in with Supabase Auth to enable cross-device sync.',
    lastSyncedAt: null,
    imported: 0,
    pushed: 0,
  });
  const supabaseSyncIdentity = effectiveSyncConfig.enabled ? effectiveSyncConfig.profileId : '';
  const [supabaseInitialPullState, setSupabaseInitialPullState] = useState<SupabaseInitialPullState>(() => ({
    key: supabaseSyncIdentity,
    complete: !effectiveSyncConfig.enabled,
  }));
  const supabaseInitialSyncComplete =
    !effectiveSyncConfig.enabled ||
    (supabaseInitialPullState.key === supabaseSyncIdentity && supabaseInitialPullState.complete);
  const supabaseInitialSyncPending = effectiveSyncConfig.enabled && !supabaseInitialSyncComplete;

  const supabaseInitialPullCompleteRef = useRef(!effectiveSyncConfig.enabled);
  const supabaseApplyingRemoteRef = useRef(false);
  const latestSessionsForPersistenceRef = useRef<TSession[]>(sessions);
  const sessionPersistTimerRef = useRef<number | null>(null);
  const lastPersistedSessionsJsonRef = useRef<string | null>(null);
  const syncStateRef = useRef<DictaSyncState>(
    buildSyncState(sessions, adaptiveBenchmarks, adaptiveSessionFeedback),
  );
  const supabasePullInFlightRef = useRef(false);
  const supabaseKnownRemoteRowsRef = useRef<DictaSyncRow[]>([]);
  const supabaseLastRemoteUpdatedAtRef = useRef<string | null>(null);
  const supabaseLastFullPullAtMsRef = useRef(0);
  const deletedSessionIdsRef = useRef<Set<string>>(loadDeletedSessionIds());
  const supabaseInitialSyncPendingRef = useRef(supabaseInitialSyncPending);
  const pendingCriticalSessionRowsRef = useRef<DictaSyncRow[]>([]);
  const supabaseAccessTokenRef = useSupabaseAccessTokenRef(
    supabaseClient,
    effectiveSyncConfig.enabled,
    supabaseSyncIdentity,
  );

  useEffect(() => {
    supabaseInitialSyncPendingRef.current = supabaseInitialSyncPending;
  }, [supabaseInitialSyncPending]);

  const {
    clearScheduledSessionPersist,
    persistSessionsToLocalStorage,
    flushScheduledSessionPersist,
  } = useSessionLocalPersistence({
    activeSessionId,
    latestSessionsForPersistenceRef,
    sessionPersistTimerRef,
    lastPersistedSessionsJsonRef,
    supabaseInitialSyncPendingRef,
    normalizeSessionForPersistence,
    onQuotaRecovered,
  });

  const {
    clearPendingCriticalSessionRows,
    rememberPendingCriticalSessionRows,
    flushPendingCriticalSessionRowsKeepalive,
  } = usePendingCriticalSessionRowsRuntime({
    effectiveSyncConfig,
    supabaseAccessTokenRef,
    pendingCriticalSessionRowsRef,
    supabaseKnownRemoteRowsRef,
  });

  const {
    persistAndPushSessionsNow,
    prependSessionAndPersistNow,
    persistAndPushAdaptiveSessionFeedbackNow,
    deleteSessionAndSync,
  } = useSessionPersistenceSyncActions({
    supabaseClient,
    syncEnabled: effectiveSyncConfig.enabled,
    profileId: effectiveSyncConfig.profileId,
    setSessions,
    adaptiveBenchmarks,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedback,
    adaptiveSessionFeedbackRef,
    buildSyncState,
    latestSessionsForPersistenceRef,
    clearScheduledSessionPersist,
    persistSessionsToLocalStorage,
    syncStateRef,
    supabaseInitialPullCompleteRef,
    supabaseApplyingRemoteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    deletedSessionIdsRef,
    setSupabaseSyncStatus,
    rememberPendingCriticalSessionRows,
    clearPendingCriticalSessionRows,
  });

  useProfileScopedSessionStorageSwitch({
    authRequired: syncConfig.authRequired,
    activeLocalSyncProfileId,
    setActiveLocalSyncProfileId,
    effectiveProfileId,
    clearScheduledSessionPersist,
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
    deletedSessionIdsRef,
    syncStateRef,
    buildSyncState,
    supabaseApplyingRemoteRef,
    supabaseInitialPullCompleteRef,
    setSupabaseInitialPullState,
    supabasePullInFlightRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    supabaseLastFullPullAtMsRef,
    pendingCriticalSessionRowsRef,
    latestSessionsForPersistenceRef,
    lastPersistedSessionsJsonRef,
  });

  useSupabaseSyncIdentityReset({
    syncEnabled: effectiveSyncConfig.enabled,
    profileId: effectiveSyncConfig.profileId,
    supabaseSyncIdentity,
    authRequired: syncConfig.authRequired,
    profileDisplayName,
    supabaseInitialPullCompleteRef,
    setSupabaseInitialPullState,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    supabaseLastFullPullAtMsRef,
    pendingCriticalSessionRowsRef,
    setSupabaseSyncStatus,
  });

  useDebouncedSessionLocalPersistence({
    sessions,
    localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending,
    latestSessionsForPersistenceRef,
    sessionPersistTimerRef,
    clearScheduledSessionPersist,
    persistSessionsToLocalStorage,
  });

  useSessionPersistenceExitFlush({
    flushScheduledSessionPersist,
    flushPendingCriticalSessionRowsKeepalive,
  });

  useEffect(() => {
    syncStateRef.current = buildSyncState(sessions, adaptiveBenchmarks, adaptiveSessionFeedback);
  }, [adaptiveBenchmarks, adaptiveSessionFeedback, buildSyncState, sessions]);

  useSupabaseSessionPullRuntime({
    supabaseClient,
    syncEnabled: effectiveSyncConfig.enabled,
    profileId: effectiveSyncConfig.profileId,
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
  });

  useSupabaseBackgroundPush({
    supabaseClient,
    syncEnabled: effectiveSyncConfig.enabled,
    profileId: effectiveSyncConfig.profileId,
    sessions,
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    buildSyncState,
    supabaseInitialPullCompleteRef,
    supabaseApplyingRemoteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    clearPendingCriticalSessionRows,
    setSupabaseSyncStatus,
  });

  return {
    localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending,
    effectiveSyncConfig,
    supabaseSyncStatus,
    flushScheduledSessionPersist,
    persistAndPushSessionsNow,
    prependSessionAndPersistNow,
    persistAndPushAdaptiveSessionFeedbackNow,
    deleteSessionAndSync,
  };
}
