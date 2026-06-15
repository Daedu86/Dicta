import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  deleteSessionSyncRow,
  latestSyncRowTimestamp,
  mergeSyncRowSnapshots,
  pushSyncRowsDetailed,
  type DictaSyncRow,
  type DictaSyncState,
} from '../../core/supabaseSync';
import { perfDiagnostics } from '../../core/perfDiagnostics';
import type { PersistableSession, SupabaseSyncStatus } from './sessionPersistenceSyncTypes';

type PushSyncStateToSupabaseOptions = {
  supabaseClient: SupabaseClient;
  profileId: string;
  syncState: DictaSyncState;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
  pushingMessage: string;
  syncedMessage: string;
  errorMessage: string;
  clearPendingSessionIds?: string[];
  clearPendingCriticalSessionRows?: (sessionIds: string[]) => void;
  setPushingStatus?: boolean;
};

export function pushSyncStateToSupabase({
  supabaseClient,
  profileId,
  syncState,
  supabaseKnownRemoteRowsRef,
  supabaseLastRemoteUpdatedAtRef,
  setSupabaseSyncStatus,
  pushingMessage,
  syncedMessage,
  errorMessage,
  clearPendingSessionIds,
  clearPendingCriticalSessionRows,
  setPushingStatus = true,
}: PushSyncStateToSupabaseOptions): void {
  if (setPushingStatus) {
    setSupabaseSyncStatus((current) => ({
      ...current,
      state: 'pushing',
      message: pushingMessage,
    }));
  }
  void pushSyncRowsDetailed(supabaseClient, profileId, syncState, {
    existingRows: supabaseKnownRemoteRowsRef.current,
  })
    .then(({ pushed, pushedRows }) => {
      supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, pushedRows);
      supabaseLastRemoteUpdatedAtRef.current =
        latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
      if (clearPendingSessionIds && clearPendingCriticalSessionRows) {
        clearPendingCriticalSessionRows(clearPendingSessionIds);
      }
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'synced',
        message: syncedMessage,
        lastSyncedAt: new Date().toISOString(),
        pushed,
      }));
    })
    .catch((error) => {
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'error',
        message: error instanceof Error ? error.message : errorMessage,
      }));
    });
}

type DeleteSessionSyncFromSupabaseOptions = {
  supabaseClient: SupabaseClient;
  profileId: string;
  sessionId: string;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
};

export function deleteSessionSyncFromSupabase({
  supabaseClient,
  profileId,
  sessionId,
  supabaseKnownRemoteRowsRef,
  supabaseLastRemoteUpdatedAtRef,
  setSupabaseSyncStatus,
}: DeleteSessionSyncFromSupabaseOptions): void {
  setSupabaseSyncStatus((current) => ({
    ...current,
    state: 'pushing',
    message: 'Deleting session in Supabase...',
  }));
  void deleteSessionSyncRow(supabaseClient, profileId, sessionId)
    .then((deletedRow) => {
      supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, [deletedRow]);
      supabaseLastRemoteUpdatedAtRef.current =
        latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'synced',
        message: 'Session deleted and synced.',
        lastSyncedAt: new Date().toISOString(),
      }));
    })
    .catch((error) => {
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete session in Supabase.',
      }));
    });
}

type UseSupabaseBackgroundPushOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  supabaseClient: SupabaseClient | null;
  syncEnabled: boolean;
  profileId: string;
  sessions: TSession[];
  adaptiveBenchmarks: TBenchmarks;
  adaptiveSessionFeedback: TFeedback;
  buildSyncState: (sessions: TSession[], benchmarks: TBenchmarks, feedback: TFeedback) => DictaSyncState;
  supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
  supabaseApplyingRemoteRef: MutableRefObject<boolean>;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  clearPendingCriticalSessionRows: (sessionIds: string[]) => void;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
};

export function useSupabaseBackgroundPush<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  supabaseClient,
  syncEnabled,
  profileId,
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
}: UseSupabaseBackgroundPushOptions<TSession, TBenchmarks, TFeedback>): void {
  useEffect(() => {
    if (!supabaseClient || !syncEnabled || !supabaseInitialPullCompleteRef.current || supabaseApplyingRemoteRef.current) return;

    const timeout = window.setTimeout(() => {
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'pushing',
        message: 'Pushing local changes to Supabase...',
      }));
      const syncState = perfDiagnostics.withSpan('supabase.buildSyncState.background', () =>
        buildSyncState(sessions, adaptiveBenchmarks, adaptiveSessionFeedback),
      );
      pushSyncStateToSupabase({
        supabaseClient,
        profileId,
        syncState,
        supabaseKnownRemoteRowsRef,
        supabaseLastRemoteUpdatedAtRef,
        setSupabaseSyncStatus,
        pushingMessage: 'Pushing local changes to Supabase...',
        syncedMessage: 'Local changes synced to Supabase.',
        errorMessage: 'Supabase sync failed.',
        setPushingStatus: false,
        clearPendingSessionIds: sessions.map((session) => session.id),
        clearPendingCriticalSessionRows,
      });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    buildSyncState,
    clearPendingCriticalSessionRows,
    profileId,
    sessions,
    setSupabaseSyncStatus,
    supabaseApplyingRemoteRef,
    supabaseClient,
    supabaseInitialPullCompleteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    syncEnabled,
  ]);
}
