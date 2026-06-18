import { useMemo, useRef, useState } from 'react';
import { readActiveSyncStorageProfileId } from '../../core/profileScopedStorage';
import type { DictaSyncRow, DictaSyncState } from '../../core/supabaseSync';
import { loadDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import { resolveLocalPayloadProfileId } from './sessionPersistenceLocalPayloadStore';
import { useSupabaseAccessTokenRef } from './sessionPersistenceSupabaseAccessToken';
import {
  buildEffectiveSyncConfig,
  createSupabaseInitialPullState,
  createSupabaseSyncStatus,
  isLocalStorageReadyForEffectiveProfile,
  isSupabaseInitialSyncComplete,
} from './sessionPersistenceSyncReadiness';
import type { PersistableSession, UseSessionPersistenceSyncOptions } from './sessionPersistenceSyncTypes';

export function useSessionPersistenceRuntimeState<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  sessions,
  syncConfig,
  supabaseClient,
  effectiveProfileId,
  adaptiveBenchmarks,
  adaptiveSessionFeedback,
  buildSyncState,
  localPayloadStore,
}: Pick<
  UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>,
  | 'sessions'
  | 'syncConfig'
  | 'supabaseClient'
  | 'effectiveProfileId'
  | 'adaptiveBenchmarks'
  | 'adaptiveSessionFeedback'
  | 'buildSyncState'
  | 'localPayloadStore'
>) {
  const [activeLocalSyncProfileId, setActiveLocalSyncProfileId] = useState(() =>
    readActiveSyncStorageProfileId(window.localStorage),
  );
  const profileStorageReadyForEffectiveProfile = isLocalStorageReadyForEffectiveProfile(
    syncConfig,
    effectiveProfileId,
    activeLocalSyncProfileId,
  );
  const localPayloadProfileId = resolveLocalPayloadProfileId(effectiveProfileId || activeLocalSyncProfileId);
  const [localPayloadReadyProfileId, setLocalPayloadReadyProfileId] = useState(() =>
    localPayloadStore ? '' : localPayloadProfileId,
  );
  const localPayloadReadyForEffectiveProfile =
    !localPayloadStore || localPayloadReadyProfileId === localPayloadProfileId;
  const localStorageReadyForEffectiveProfile =
    profileStorageReadyForEffectiveProfile && localPayloadReadyForEffectiveProfile;
  const effectiveSyncConfig = useMemo(
    () => buildEffectiveSyncConfig(syncConfig, effectiveProfileId, localStorageReadyForEffectiveProfile),
    [syncConfig, effectiveProfileId, localStorageReadyForEffectiveProfile],
  );
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState(() =>
    createSupabaseSyncStatus(effectiveSyncConfig.enabled),
  );
  const supabaseSyncIdentity = effectiveSyncConfig.enabled ? effectiveSyncConfig.profileId : '';
  const [supabaseInitialPullState, setSupabaseInitialPullState] = useState(() =>
    createSupabaseInitialPullState(supabaseSyncIdentity, effectiveSyncConfig.enabled),
  );
  const supabaseInitialSyncComplete = isSupabaseInitialSyncComplete(
    effectiveSyncConfig.enabled,
    supabaseInitialPullState,
    supabaseSyncIdentity,
  );
  const supabaseInitialSyncPending = effectiveSyncConfig.enabled && !supabaseInitialSyncComplete;

  const supabaseInitialPullCompleteRef = useRef(!effectiveSyncConfig.enabled);
  const supabaseApplyingRemoteRef = useRef(false);
  const latestSessionsForPersistenceRef = useRef<TSession[]>(sessions);
  const pendingHydratedSessionsRef = useRef<TSession[] | null>(null);
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

  return {
    activeLocalSyncProfileId,
    setActiveLocalSyncProfileId,
    profileStorageReadyForEffectiveProfile,
    localPayloadProfileId,
    localPayloadReadyForEffectiveProfile,
    setLocalPayloadReadyProfileId,
    localStorageReadyForEffectiveProfile,
    effectiveSyncConfig,
    supabaseSyncStatus,
    setSupabaseSyncStatus,
    supabaseSyncIdentity,
    supabaseInitialPullState,
    setSupabaseInitialPullState,
    supabaseInitialSyncPending,
    supabaseInitialPullCompleteRef,
    supabaseApplyingRemoteRef,
    latestSessionsForPersistenceRef,
    pendingHydratedSessionsRef,
    sessionPersistTimerRef,
    lastPersistedSessionsJsonRef,
    syncStateRef,
    supabasePullInFlightRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    supabaseLastFullPullAtMsRef,
    deletedSessionIdsRef,
    supabaseInitialSyncPendingRef,
    pendingCriticalSessionRowsRef,
    supabaseAccessTokenRef,
  };
}
