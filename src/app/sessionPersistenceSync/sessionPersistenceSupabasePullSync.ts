import { isTransientGenerationErrorSessionLike } from '../../core/adaptive/openRouterFallbackScript';
import {
  deleteSessionSyncRow,
  latestSyncRowTimestamp,
  mergeSyncRowSnapshots,
  mergeSyncRows,
  pullSyncRows,
  pushSyncRowsDetailed,
} from '../../core/supabaseSync';
import { persistDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import {
  collectTransientErrorSessionIds,
  shouldUseFullSupabasePull,
} from '../sessionPersistenceSupabasePullPlan';
import type { PersistableSession } from './sessionPersistenceSyncTypes';
import type { UseSupabaseSessionPullRuntimeOptions } from './sessionPersistenceSupabasePullTypes';

type PullReason = 'initial' | 'background';
type SupabaseClientForPull<TSession extends PersistableSession, TBenchmarks, TFeedback> = NonNullable<
  UseSupabaseSessionPullRuntimeOptions<TSession, TBenchmarks, TFeedback>['supabaseClient']
>;

type CreateSupabasePullSyncArgs<TSession extends PersistableSession, TBenchmarks, TFeedback> = Omit<
  UseSupabaseSessionPullRuntimeOptions<TSession, TBenchmarks, TFeedback>,
  'supabaseClient' | 'syncEnabled'
> & {
  client: SupabaseClientForPull<TSession, TBenchmarks, TFeedback>;
  isCancelled: () => boolean;
};

export function createSupabasePullSync<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  client,
  profileId,
  supabaseSyncIdentity,
  normalizeRestoredSession,
  setSessions,
  setAdaptiveBenchmarks,
  setAdaptiveSessionFeedback,
  setSupabaseSyncStatus,
  setSupabaseInitialPullState,
  syncStateRef,
  deletedSessionIdsRef,
  supabasePullInFlightRef,
  supabaseKnownRemoteRowsRef,
  supabaseLastRemoteUpdatedAtRef,
  supabaseLastFullPullAtMsRef,
  supabaseApplyingRemoteRef,
  supabaseInitialPullCompleteRef,
  clearPendingCriticalSessionRows,
  isCancelled,
}: CreateSupabasePullSyncArgs<TSession, TBenchmarks, TFeedback>): (reason: PullReason) => Promise<void> {
  return async (reason) => {
    if (supabasePullInFlightRef.current) return;
    supabasePullInFlightRef.current = true;
    setSupabaseSyncStatus((current) => ({
      ...current,
      state: 'pulling',
      message: reason === 'initial' ? 'Pulling Supabase sync data...' : 'Refreshing Supabase sync data...',
    }));
    try {
      const nowMs = Date.now();
      const shouldFullPull = shouldUseFullSupabasePull(reason, nowMs, supabaseLastFullPullAtMsRef.current);
      const rows = await pullSyncRows(client, profileId, {
        updatedAfter: shouldFullPull ? null : supabaseLastRemoteUpdatedAtRef.current,
      });
      if (isCancelled()) return;
      if (shouldFullPull) supabaseLastFullPullAtMsRef.current = nowMs;
      supabaseKnownRemoteRowsRef.current = shouldFullPull
        ? rows
        : mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, rows);
      supabaseLastRemoteUpdatedAtRef.current =
        latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;

      deleteTransientErrorRows(rows, client, profileId, deletedSessionIdsRef.current);
      const merged = mergeSyncRows(syncStateRef.current, rows);
      if (merged.deletedSessionIds.length > 0) {
        merged.deletedSessionIds.forEach((sessionId) => deletedSessionIdsRef.current.add(sessionId));
        persistDeletedSessionIds(deletedSessionIdsRef.current);
      }

      const filteredMergedSessions = (merged.sessions as TSession[])
        .map(normalizeRestoredSession)
        .filter((session) => !deletedSessionIdsRef.current.has(session.id) && !isTransientGenerationErrorSessionLike(session));
      if (merged.changed || filteredMergedSessions.length !== (merged.sessions as TSession[]).length) {
        applyRemoteSupabaseMerge(filteredMergedSessions, merged.benchmarks as TBenchmarks, merged.feedback as TFeedback, {
          setSessions,
          setAdaptiveBenchmarks,
          setAdaptiveSessionFeedback,
          supabaseApplyingRemoteRef,
        });
      }

      markInitialPullComplete(supabaseInitialPullCompleteRef, setSupabaseInitialPullState, supabaseSyncIdentity);
      const postMergeState = { ...merged, sessions: filteredMergedSessions };
      const { pushed, pushedRows } = await pushSyncRowsDetailed(client, profileId, postMergeState, {
        existingRows: supabaseKnownRemoteRowsRef.current,
      });
      supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, pushedRows);
      supabaseLastRemoteUpdatedAtRef.current =
        latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
      clearPendingCriticalSessionRows((postMergeState.sessions as TSession[]).map((session) => session.id));
      if (isCancelled()) return;
      setSupabaseSyncStatus({
        enabled: true,
        state: 'synced',
        message: merged.imported > 0 ? `Synced. Imported ${merged.imported} remote item${merged.imported === 1 ? '' : 's'}.` : 'Synced with Supabase.',
        lastSyncedAt: new Date().toISOString(),
        imported: merged.imported,
        pushed,
      });
    } catch (error) {
      if (isCancelled()) return;
      markInitialPullComplete(supabaseInitialPullCompleteRef, setSupabaseInitialPullState, supabaseSyncIdentity);
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'error',
        message: error instanceof Error ? error.message : 'Supabase sync failed.',
      }));
    } finally {
      supabasePullInFlightRef.current = false;
    }
  };
}

function deleteTransientErrorRows<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  rows: Parameters<typeof collectTransientErrorSessionIds>[0],
  client: SupabaseClientForPull<TSession, TBenchmarks, TFeedback>,
  profileId: string,
  deletedSessionIds: Set<string>,
): void {
  const transientErrorSessionIds = collectTransientErrorSessionIds(rows);
  if (transientErrorSessionIds.length === 0) return;
  transientErrorSessionIds.forEach((sessionId) => deletedSessionIds.add(sessionId));
  persistDeletedSessionIds(deletedSessionIds);
  void Promise.allSettled(transientErrorSessionIds.map((sessionId) => deleteSessionSyncRow(client, profileId, sessionId)));
}

function applyRemoteSupabaseMerge<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  sessions: TSession[],
  benchmarks: TBenchmarks,
  feedback: TFeedback,
  {
    setSessions,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
    supabaseApplyingRemoteRef,
  }: Pick<
    CreateSupabasePullSyncArgs<TSession, TBenchmarks, TFeedback>,
    'setSessions' | 'setAdaptiveBenchmarks' | 'setAdaptiveSessionFeedback' | 'supabaseApplyingRemoteRef'
  >,
): void {
  supabaseApplyingRemoteRef.current = true;
  setSessions(sessions);
  setAdaptiveBenchmarks(benchmarks);
  setAdaptiveSessionFeedback(feedback);
  window.setTimeout(() => {
    supabaseApplyingRemoteRef.current = false;
  }, 0);
}

function markInitialPullComplete<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  supabaseInitialPullCompleteRef: CreateSupabasePullSyncArgs<
    TSession,
    TBenchmarks,
    TFeedback
  >['supabaseInitialPullCompleteRef'],
  setSupabaseInitialPullState: CreateSupabasePullSyncArgs<
    TSession,
    TBenchmarks,
    TFeedback
  >['setSupabaseInitialPullState'],
  supabaseSyncIdentity: string,
): void {
  supabaseInitialPullCompleteRef.current = true;
  setSupabaseInitialPullState({
    key: supabaseSyncIdentity,
    complete: true,
  });
}
