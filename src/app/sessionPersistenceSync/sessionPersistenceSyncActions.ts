import { useCallback } from 'react';
import type { DictaSyncState } from '../../core/supabaseSync';
import { perfDiagnostics } from '../../core/perfDiagnostics';
import { SESSION_CREATE_SYNC_OPTIONS } from './sessionPersistenceSyncConstants';
import { pushSyncStateToSupabase } from './sessionPersistenceSupabasePush';
import type { ImmediateSessionSyncOptions, PersistableSession } from './sessionPersistenceSyncTypes';
import type {
  SessionPersistenceSyncActions,
  UseSessionPersistenceSyncActionsOptions,
} from './sessionPersistenceSyncActionTypes';
import { useSessionPersistenceDeleteAction } from './sessionPersistenceDeleteAction';
import { useSessionPersistenceFeedbackAction } from './sessionPersistenceFeedbackAction';

export function useSessionPersistenceSyncActions<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  options: UseSessionPersistenceSyncActionsOptions<TSession, TBenchmarks, TFeedback>,
): SessionPersistenceSyncActions<TSession, TFeedback> {
  const {
    supabaseClient,
    syncEnabled,
    profileId,
    setSessions,
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    buildSyncState,
    latestSessionsForPersistenceRef,
    clearScheduledSessionPersist,
    persistSessionsToLocalStorage,
    syncStateRef,
    supabaseInitialPullCompleteRef,
    supabaseApplyingRemoteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    setSupabaseSyncStatus,
    rememberPendingCriticalSessionRows,
    clearPendingCriticalSessionRows,
  } = options;

  const persistAndPushAdaptiveSessionFeedbackNow = useSessionPersistenceFeedbackAction(options);
  const deleteSessionAndSync = useSessionPersistenceDeleteAction(options);

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

  return {
    persistAndPushSessionsNow,
    prependSessionAndPersistNow,
    persistAndPushAdaptiveSessionFeedbackNow,
    deleteSessionAndSync,
  };
}
