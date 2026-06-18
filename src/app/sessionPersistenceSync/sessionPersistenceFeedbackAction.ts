import { useCallback } from 'react';
import { perfDiagnostics } from '../../core/perfDiagnostics';
import { filterSessionsByRetention } from '../sessionRetentionPolicy';
import { ADAPTIVE_SESSION_FEEDBACK_KEY } from './sessionPersistenceSyncConstants';
import { trySetLocalStorageItem } from '../localStorageQuota';
import { pushSyncStateToSupabase } from './sessionPersistenceSupabasePush';
import type { PersistableSession } from './sessionPersistenceSyncTypes';
import type { UseSessionPersistenceSyncActionsOptions } from './sessionPersistenceSyncActionTypes';

export function useSessionPersistenceFeedbackAction<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  supabaseClient,
  syncEnabled,
  profileId,
  adaptiveBenchmarksRef,
  adaptiveSessionFeedbackRef,
  buildSyncState,
  latestSessionsForPersistenceRef,
  syncStateRef,
  supabaseInitialPullCompleteRef,
  supabaseApplyingRemoteRef,
  supabaseKnownRemoteRowsRef,
  supabaseLastRemoteUpdatedAtRef,
  setSupabaseSyncStatus,
  localPayloadProfileId,
  localPayloadStore,
}: UseSessionPersistenceSyncActionsOptions<TSession, TBenchmarks, TFeedback>) {
  return useCallback((nextFeedback: TFeedback): void => {
    adaptiveSessionFeedbackRef.current = nextFeedback;
    if (localPayloadStore) {
      void localPayloadStore.saveAdaptiveSessionFeedback(localPayloadProfileId, nextFeedback).catch((error: unknown) => {
        console.warn('[DictaStorage] IndexedDB adaptive feedback write failed.', error);
      });
    } else {
      trySetLocalStorageItem(ADAPTIVE_SESSION_FEEDBACK_KEY, JSON.stringify(nextFeedback));
    }
    const retainedSessions = filterSessionsByRetention(latestSessionsForPersistenceRef.current);
    const syncState = perfDiagnostics.withSpan('supabase.buildSyncState.feedbackFinal', () =>
      buildSyncState(retainedSessions, adaptiveBenchmarksRef.current, nextFeedback),
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
    localPayloadProfileId,
    localPayloadStore,
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
}
