import { useCallback } from 'react';
import { persistDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import { deleteSessionSyncFromSupabase } from './sessionPersistenceSupabasePush';
import type { PersistableSession } from './sessionPersistenceSyncTypes';
import type { UseSessionPersistenceSyncActionsOptions } from './sessionPersistenceSyncActionTypes';

export function useSessionPersistenceDeleteAction<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  supabaseClient,
  syncEnabled,
  profileId,
  setSessions,
  deletedSessionIdsRef,
  supabaseKnownRemoteRowsRef,
  supabaseLastRemoteUpdatedAtRef,
  setSupabaseSyncStatus,
  localPayloadProfileId,
  localPayloadStore,
}: UseSessionPersistenceSyncActionsOptions<TSession, TBenchmarks, TFeedback>) {
  return useCallback((sessionId: string): void => {
    deletedSessionIdsRef.current.add(sessionId);
    if (localPayloadStore) {
      void Promise.all([
        localPayloadStore.deleteSession(localPayloadProfileId, sessionId),
        localPayloadStore.saveDeletedSessionIds(localPayloadProfileId, deletedSessionIdsRef.current),
      ]).catch((error: unknown) => {
        console.warn('[DictaStorage] IndexedDB tombstone write failed.', error);
      });
    } else {
      persistDeletedSessionIds(deletedSessionIdsRef.current);
    }
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
    localPayloadProfileId,
    localPayloadStore,
    profileId,
    setSessions,
    setSupabaseSyncStatus,
    supabaseClient,
    supabaseKnownRemoteRowsRef,
    supabaseLastRemoteUpdatedAtRef,
    syncEnabled,
  ]);
}
