import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DictaSyncRow, DictaSyncState } from '../../core/supabaseSync';
import { switchProfileScopedStorage } from '../../core/profileScopedStorage';
import { loadDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import { PROFILE_SCOPED_DICTA_STORAGE_KEYS } from './sessionPersistenceSyncConstants';
import type { PersistableSession, SupabaseInitialPullState } from './sessionPersistenceSyncTypes';

type UseProfileScopedSessionStorageSwitchOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  authRequired: boolean;
  activeLocalSyncProfileId: string;
  setActiveLocalSyncProfileId: Dispatch<SetStateAction<string>>;
  effectiveProfileId: string;
  clearScheduledSessionPersist: () => void;
  loadSessions: () => TSession[];
  setSessions: Dispatch<SetStateAction<TSession[]>>;
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  onProfileStorageSwitched: () => void;
  loadAdaptiveBenchmarks: () => TBenchmarks;
  adaptiveBenchmarksRef: MutableRefObject<TBenchmarks>;
  setAdaptiveBenchmarks: Dispatch<SetStateAction<TBenchmarks>>;
  loadAdaptiveSessionFeedback: () => TFeedback;
  adaptiveSessionFeedbackRef: MutableRefObject<TFeedback>;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<TFeedback>>;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  syncStateRef: MutableRefObject<DictaSyncState>;
  buildSyncState: (sessions: TSession[], benchmarks: TBenchmarks, feedback: TFeedback) => DictaSyncState;
  pruneAdaptiveSessionFeedbackForDeletedSessions?: (
    feedback: TFeedback,
    sessionIds: ReadonlySet<string>,
  ) => TFeedback;
  supabaseApplyingRemoteRef: MutableRefObject<boolean>;
  supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
  setSupabaseInitialPullState: Dispatch<SetStateAction<SupabaseInitialPullState>>;
  supabasePullInFlightRef: MutableRefObject<boolean>;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  supabaseLastFullPullAtMsRef: MutableRefObject<number>;
  pendingCriticalSessionRowsRef: MutableRefObject<DictaSyncRow[]>;
  latestSessionsForPersistenceRef: MutableRefObject<TSession[]>;
  lastPersistedSessionsJsonRef: MutableRefObject<string | null>;
};

export function useProfileScopedSessionStorageSwitch<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  authRequired,
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
  pruneAdaptiveSessionFeedbackForDeletedSessions,
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
}: UseProfileScopedSessionStorageSwitchOptions<TSession, TBenchmarks, TFeedback>): void {
  useEffect(() => {
    if (!authRequired) return;

    const result = switchProfileScopedStorage(window.localStorage, PROFILE_SCOPED_DICTA_STORAGE_KEYS, effectiveProfileId);
    if (!result.changed) {
      if (activeLocalSyncProfileId !== result.activeProfileId) {
        setActiveLocalSyncProfileId(result.activeProfileId);
      }
      return;
    }

    setActiveLocalSyncProfileId(result.activeProfileId);
    clearScheduledSessionPersist();

    const restoredSessions = loadSessions();
    latestSessionsForPersistenceRef.current = restoredSessions;
    lastPersistedSessionsJsonRef.current = null;
    setSessions(restoredSessions);
    setActiveSessionId(restoredSessions[0]?.id ?? '');
    onProfileStorageSwitched();

    const restoredBenchmarks = loadAdaptiveBenchmarks();
    adaptiveBenchmarksRef.current = restoredBenchmarks;
    setAdaptiveBenchmarks(restoredBenchmarks);

    deletedSessionIdsRef.current = loadDeletedSessionIds();
    const loadedFeedback = loadAdaptiveSessionFeedback();
    const restoredFeedback = pruneAdaptiveSessionFeedbackForDeletedSessions
      ? pruneAdaptiveSessionFeedbackForDeletedSessions(loadedFeedback, deletedSessionIdsRef.current)
      : loadedFeedback;
    adaptiveSessionFeedbackRef.current = restoredFeedback;
    setAdaptiveSessionFeedback(restoredFeedback);

    syncStateRef.current = buildSyncState(restoredSessions, restoredBenchmarks, restoredFeedback);
    supabaseApplyingRemoteRef.current = false;
    supabaseInitialPullCompleteRef.current = !result.activeProfileId;
    setSupabaseInitialPullState({
      key: result.activeProfileId,
      complete: !result.activeProfileId,
    });
    supabasePullInFlightRef.current = false;
    supabaseKnownRemoteRowsRef.current = [];
    supabaseLastRemoteUpdatedAtRef.current = null;
    supabaseLastFullPullAtMsRef.current = 0;
    pendingCriticalSessionRowsRef.current = [];
  }, [
    activeLocalSyncProfileId,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackRef,
    authRequired,
    buildSyncState,
    clearScheduledSessionPersist,
    deletedSessionIdsRef,
    effectiveProfileId,
    lastPersistedSessionsJsonRef,
    latestSessionsForPersistenceRef,
    loadAdaptiveBenchmarks,
    loadAdaptiveSessionFeedback,
    loadSessions,
    onProfileStorageSwitched,
    pendingCriticalSessionRowsRef,
    pruneAdaptiveSessionFeedbackForDeletedSessions,
    setActiveLocalSyncProfileId,
    setActiveSessionId,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
    setSessions,
    setSupabaseInitialPullState,
    supabaseApplyingRemoteRef,
    supabaseInitialPullCompleteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastFullPullAtMsRef,
    supabaseLastRemoteUpdatedAtRef,
    supabasePullInFlightRef,
    syncStateRef,
  ]);
}
