import {
  deleteSessionSyncRow,
  pushSyncRowsDetailed,
} from '../../core/supabaseSync';
import { mergeSupabaseRemoteRows } from './sessionPersistenceSupabaseRemoteRows';
import type {
  DeleteSessionSyncFromSupabaseOptions,
  PushSyncStateToSupabaseOptions,
} from './sessionPersistenceSupabasePushTypes';

function syncErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

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
      mergeSupabaseRemoteRows({ supabaseKnownRemoteRowsRef, supabaseLastRemoteUpdatedAtRef }, pushedRows);
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
        message: syncErrorMessage(error, errorMessage),
      }));
    });
}

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
      mergeSupabaseRemoteRows({ supabaseKnownRemoteRowsRef, supabaseLastRemoteUpdatedAtRef }, [deletedRow]);
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
        message: syncErrorMessage(error, 'Failed to delete session in Supabase.'),
      }));
    });
}
