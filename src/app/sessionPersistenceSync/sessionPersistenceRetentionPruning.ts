import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteSessionSyncRow, type DictaSyncRow, type DictaSyncState } from '../../core/supabaseSync';
import { persistDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import {
  partitionSessionsByRetention,
  pickNewestRetainedSessionId,
} from '../sessionRetentionPolicy';
import { ADAPTIVE_SESSION_FEEDBACK_KEY } from './sessionPersistenceSyncConstants';
import { mergeSupabaseRemoteRows } from './sessionPersistenceSupabaseRemoteRows';
import type {
  PersistableSession,
  SupabaseSyncStatus,
} from './sessionPersistenceSyncTypes';

type UseSessionRetentionPruningOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  sessions: TSession[];
  setSessions: Dispatch<SetStateAction<TSession[]>>;
  activeSessionId: string;
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  adaptiveBenchmarks: TBenchmarks;
  adaptiveSessionFeedback: TFeedback;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<TFeedback>>;
  adaptiveSessionFeedbackRef: MutableRefObject<TFeedback>;
  pruneAdaptiveSessionFeedbackForDeletedSessions?: (
    feedback: TFeedback,
    sessionIds: ReadonlySet<string>,
  ) => TFeedback;
  buildSyncState: (sessions: TSession[], benchmarks: TBenchmarks, feedback: TFeedback) => DictaSyncState;
  syncStateRef: MutableRefObject<DictaSyncState>;
  latestSessionsForPersistenceRef: MutableRefObject<TSession[]>;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  localStorageReadyForEffectiveProfile: boolean;
  syncEnabled: boolean;
  supabaseClient: SupabaseClient | null;
  profileId: string;
  supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  clearScheduledSessionPersist: () => void;
  persistSessionsToLocalStorage: (nextSessions: TSession[], spanName?: string) => void;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
};

export function useSessionRetentionPruning<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  sessions,
  setSessions,
  activeSessionId,
  setActiveSessionId,
  adaptiveBenchmarks,
  adaptiveSessionFeedback,
  setAdaptiveSessionFeedback,
  adaptiveSessionFeedbackRef,
  pruneAdaptiveSessionFeedbackForDeletedSessions,
  buildSyncState,
  syncStateRef,
  latestSessionsForPersistenceRef,
  deletedSessionIdsRef,
  localStorageReadyForEffectiveProfile,
  syncEnabled,
  supabaseClient,
  profileId,
  supabaseInitialPullCompleteRef,
  supabaseKnownRemoteRowsRef,
  supabaseLastRemoteUpdatedAtRef,
  clearScheduledSessionPersist,
  persistSessionsToLocalStorage,
  setSupabaseSyncStatus,
}: UseSessionRetentionPruningOptions<TSession, TBenchmarks, TFeedback>): void {
  useEffect(() => {
    if (!localStorageReadyForEffectiveProfile) return;
    if (syncEnabled && !supabaseInitialPullCompleteRef.current) return;

    const {
      retainedSessions,
      expiredSessionIds,
    } = partitionSessionsByRetention(sessions);
    if (expiredSessionIds.size === 0) return;

    for (const sessionId of expiredSessionIds) {
      deletedSessionIdsRef.current.add(sessionId);
    }
    persistDeletedSessionIds(deletedSessionIdsRef.current);

    const nextFeedback = pruneAdaptiveSessionFeedbackForDeletedSessions
      ? pruneAdaptiveSessionFeedbackForDeletedSessions(adaptiveSessionFeedback, expiredSessionIds)
      : adaptiveSessionFeedback;

    latestSessionsForPersistenceRef.current = retainedSessions;
    syncStateRef.current = buildSyncState(retainedSessions, adaptiveBenchmarks, nextFeedback);
    clearScheduledSessionPersist();
    persistSessionsToLocalStorage(retainedSessions, 'session.retention.localStorage');

    if (nextFeedback !== adaptiveSessionFeedback) {
      adaptiveSessionFeedbackRef.current = nextFeedback;
      window.localStorage.setItem(ADAPTIVE_SESSION_FEEDBACK_KEY, JSON.stringify(nextFeedback));
      setAdaptiveSessionFeedback(nextFeedback);
    }

    setSessions(retainedSessions);
    if (expiredSessionIds.has(activeSessionId)) {
      setActiveSessionId(pickNewestRetainedSessionId(retainedSessions));
    }

    if (!supabaseClient || !syncEnabled) return;

    pushRetentionTombstones({
      supabaseClient,
      profileId,
      sessionIds: [...expiredSessionIds],
      supabaseKnownRemoteRowsRef,
      supabaseLastRemoteUpdatedAtRef,
      setSupabaseSyncStatus,
    });
  }, [
    activeSessionId,
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    adaptiveSessionFeedbackRef,
    buildSyncState,
    clearScheduledSessionPersist,
    deletedSessionIdsRef,
    latestSessionsForPersistenceRef,
    localStorageReadyForEffectiveProfile,
    persistSessionsToLocalStorage,
    profileId,
    pruneAdaptiveSessionFeedbackForDeletedSessions,
    sessions,
    setActiveSessionId,
    setAdaptiveSessionFeedback,
    setSessions,
    setSupabaseSyncStatus,
    supabaseClient,
    supabaseInitialPullCompleteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    syncEnabled,
    syncStateRef,
  ]);
}

type PushRetentionTombstonesOptions = {
  supabaseClient: SupabaseClient;
  profileId: string;
  sessionIds: string[];
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
};

function pushRetentionTombstones({
  supabaseClient,
  profileId,
  sessionIds,
  supabaseKnownRemoteRowsRef,
  supabaseLastRemoteUpdatedAtRef,
  setSupabaseSyncStatus,
}: PushRetentionTombstonesOptions): void {
  if (sessionIds.length === 0) return;

  setSupabaseSyncStatus((current) => ({
    ...current,
    state: 'pushing',
    message: `Pruning ${sessionIds.length} expired session${sessionIds.length === 1 ? '' : 's'} from Supabase...`,
  }));

  void Promise.all(sessionIds.map((sessionId) => deleteSessionSyncRow(supabaseClient, profileId, sessionId)))
    .then((deletedRows) => {
      mergeSupabaseRemoteRows({ supabaseKnownRemoteRowsRef, supabaseLastRemoteUpdatedAtRef }, deletedRows);
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'synced',
        message: `Pruned ${sessionIds.length} expired session${sessionIds.length === 1 ? '' : 's'}.`,
        lastSyncedAt: new Date().toISOString(),
      }));
    })
    .catch((error) => {
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to prune expired sessions in Supabase.',
      }));
    });
}
