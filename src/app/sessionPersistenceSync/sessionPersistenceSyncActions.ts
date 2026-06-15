import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DictaSyncRow, DictaSyncState } from '../../core/supabaseSync';
import { perfDiagnostics } from '../../core/perfDiagnostics';
import { persistDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import {
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  SESSION_CREATE_SYNC_OPTIONS,
} from './sessionPersistenceSyncConstants';
import {
  deleteSessionSyncFromSupabase,
  pushSyncStateToSupabase,
} from './sessionPersistenceSupabasePush';
import type {
  ImmediateSessionSyncOptions,
  PersistableSession,
  SupabaseSyncStatus,
  UseSessionPersistenceSyncResult,
} from './sessionPersistenceSyncTypes';

export type SessionPersistenceSyncActions<TSession extends PersistableSession, TFeedback> = Pick<
  UseSessionPersistenceSyncResult<TSession, TFeedback>,
  'persistAndPushSessionsNow' | 'prependSessionAndPersistNow' | 'persistAndPushAdaptiveSessionFeedbackNow' | 'deleteSessionAndSync'
>;

type UseSessionPersistenceSyncActionsOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  supabaseClient: SupabaseClient | null;
  syncEnabled: boolean;
  profileId: string;
  setSessions: Dispatch<SetStateAction<TSession[]>>;
  adaptiveBenchmarks: TBenchmarks;
  adaptiveBenchmarksRef: MutableRefObject<TBenchmarks>;
  adaptiveSessionFeedback: TFeedback;
  adaptiveSessionFeedbackRef: MutableRefObject<TFeedback>;
  buildSyncState: (sessions: TSession[], benchmarks: TBenchmarks, feedback: TFeedback) => DictaSyncState;
  latestSessionsForPersistenceRef: MutableRefObject<TSession[]>;
  clearScheduledSessionPersist: () => void;
  persistSessionsToLocalStorage: (nextSessions: TSession[], spanName?: string) => void;
  syncStateRef: MutableRefObject<DictaSyncState>;
  supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
  supabaseApplyingRemoteRef: MutableRefObject<boolean>;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
  rememberPendingCriticalSessionRows: (syncState: DictaSyncState, sessionIds: string[]) => void;
  clearPendingCriticalSessionRows: (sessionIds: string[]) => void;
};

export function useSessionPersistenceSyncActions<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  supabaseClient,
  syncEnabled,
  profileId,
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
}: UseSessionPersistenceSyncActionsOptions<TSession, TBenchmarks, TFeedback>): SessionPersistenceSyncActions<TSession, TFeedback> {
  const persistAndPushSessionsNow = useCallback((nextSessions: TSession[], options: ImmediateSessionSyncOptions = {}): void => {
    const {
      localStorageSpanName = 'session.persistNow.localStorage',
      buildSpanName = 'supabase.buildSyncState.final',
      pushingMessage = 'Pushing final session to Supabase...',
      syncedMessage = 'Final session synced to Supabase.',
      errorMessage = 'Supabase sync failed.',
      criticalSessionIds = [],
    } = options;
    latestSessionsForPersistenceRef.current = nextSessions;
    clearScheduledSessionPersist();
    persistSessionsToLocalStorage(nextSessions, localStorageSpanName);

    let syncState: DictaSyncState | null = null;
    if (supabaseClient && syncEnabled) {
      syncState = perfDiagnostics.withSpan(buildSpanName, () =>
        buildSyncState(nextSessions, adaptiveBenchmarks, adaptiveSessionFeedback),
      );
      syncStateRef.current = syncState;
      rememberPendingCriticalSessionRows(syncState, criticalSessionIds);
    }

    if (!supabaseClient || !syncEnabled || !syncState || !supabaseInitialPullCompleteRef.current || supabaseApplyingRemoteRef.current) return;

    pushSyncStateToSupabase({
      supabaseClient,
      profileId,
      syncState,
      supabaseKnownRemoteRowsRef,
      supabaseLastRemoteUpdatedAtRef,
      setSupabaseSyncStatus,
      pushingMessage,
      syncedMessage,
      errorMessage,
      clearPendingSessionIds: criticalSessionIds,
      clearPendingCriticalSessionRows,
    });
  }, [
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    buildSyncState,
    clearPendingCriticalSessionRows,
    clearScheduledSessionPersist,
    latestSessionsForPersistenceRef,
    persistSessionsToLocalStorage,
    profileId,
    rememberPendingCriticalSessionRows,
    setSupabaseSyncStatus,
    supabaseApplyingRemoteRef,
    supabaseClient,
    supabaseInitialPullCompleteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    syncEnabled,
    syncStateRef,
  ]);

  const prependSessionAndPersistNow = useCallback((createNextSession: (previousSessions: TSession[]) => TSession): TSession => {
    const previousSessions = latestSessionsForPersistenceRef.current;
    const nextSession = createNextSession(previousSessions);
    const nextSessions = [nextSession, ...previousSessions];
    setSessions(nextSessions);
    persistAndPushSessionsNow(nextSessions, SESSION_CREATE_SYNC_OPTIONS);
    return nextSession;
  }, [latestSessionsForPersistenceRef, persistAndPushSessionsNow, setSessions]);

  const persistAndPushAdaptiveSessionFeedbackNow = useCallback((nextFeedback: TFeedback): void => {
    adaptiveSessionFeedbackRef.current = nextFeedback;
    window.localStorage.setItem(ADAPTIVE_SESSION_FEEDBACK_KEY, JSON.stringify(nextFeedback));
    const syncState = perfDiagnostics.withSpan('supabase.buildSyncState.feedbackFinal', () =>
      buildSyncState(latestSessionsForPersistenceRef.current, adaptiveBenchmarksRef.current, nextFeedback),
    );
    syncStateRef.current = syncState;
    if (!supabaseClient || !syncEnabled || !supabaseInitialPullCompleteRef.current || supabaseApplyingRemoteRef.current) return;

    pushSyncStateToSupabase({
      supabaseClient,
      profileId,
      syncState,
      supabaseKnownRemoteRowsRef,
      supabaseLastRemoteUpdatedAtRef,
      setSupabaseSyncStatus,
      pushingMessage: 'Pushing completed session feedback to Supabase...',
      syncedMessage: 'Completed session feedback synced to Supabase.',
      errorMessage: 'Supabase feedback sync failed.',
    });
  }, [
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackRef,
    buildSyncState,
    latestSessionsForPersistenceRef,
    profileId,
    setSupabaseSyncStatus,
    supabaseApplyingRemoteRef,
    supabaseClient,
    supabaseInitialPullCompleteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    syncEnabled,
    syncStateRef,
  ]);

  const deleteSessionAndSync = useCallback((sessionId: string): void => {
    deletedSessionIdsRef.current.add(sessionId);
    persistDeletedSessionIds(deletedSessionIdsRef.current);
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    if (supabaseClient && syncEnabled) {
      deleteSessionSyncFromSupabase({
        supabaseClient,
        profileId,
        sessionId,
        supabaseKnownRemoteRowsRef,
        supabaseLastRemoteUpdatedAtRef,
        setSupabaseSyncStatus,
      });
    }
  }, [
    deletedSessionIdsRef,
    profileId,
    setSessions,
    setSupabaseSyncStatus,
    supabaseClient,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    syncEnabled,
  ]);

  return {
    persistAndPushSessionsNow,
    prependSessionAndPersistNow,
    persistAndPushAdaptiveSessionFeedbackNow,
    deleteSessionAndSync,
  };
}
