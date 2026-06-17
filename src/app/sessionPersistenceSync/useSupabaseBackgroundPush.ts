import { useEffect } from 'react';
import { perfDiagnostics } from '../../core/perfDiagnostics';
import { pushSyncStateToSupabase } from './sessionPersistenceSupabasePushActions';
import type { PersistableSession } from './sessionPersistenceSyncTypes';
import type { UseSupabaseBackgroundPushOptions } from './sessionPersistenceSupabasePushTypes';

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
