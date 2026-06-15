import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isTransientGenerationErrorSessionLike } from '../../core/adaptive/openRouterFallbackScript';
import {
  deleteSessionSyncRow,
  latestSyncRowTimestamp,
  mergeSyncRowSnapshots,
  mergeSyncRows,
  pullSyncRows,
  pushSyncRowsDetailed,
  type DictaSyncRow,
  type DictaSyncState,
} from '../../core/supabaseSync';
import { persistDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import {
  collectTransientErrorSessionIds,
  shouldUseFullSupabasePull,
} from '../sessionPersistenceSupabasePullPlan';
import { SUPABASE_BACKGROUND_PULL_INTERVAL_MS } from './sessionPersistenceSyncConstants';
import type {
  PersistableSession,
  SupabaseInitialPullState,
  SupabaseSyncStatus,
} from './sessionPersistenceSyncTypes';

type UseSupabaseSessionPullRuntimeOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  supabaseClient: SupabaseClient | null;
  syncEnabled: boolean;
  profileId: string;
  supabaseSyncIdentity: string;
  normalizeRestoredSession: (session: TSession) => TSession;
  setSessions: Dispatch<SetStateAction<TSession[]>>;
  setAdaptiveBenchmarks: Dispatch<SetStateAction<TBenchmarks>>;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<TFeedback>>;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
  setSupabaseInitialPullState: Dispatch<SetStateAction<SupabaseInitialPullState>>;
  syncStateRef: MutableRefObject<DictaSyncState>;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  supabasePullInFlightRef: MutableRefObject<boolean>;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  supabaseLastFullPullAtMsRef: MutableRefObject<number>;
  supabaseApplyingRemoteRef: MutableRefObject<boolean>;
  supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
  clearPendingCriticalSessionRows: (sessionIds: string[]) => void;
};

export function useSupabaseSessionPullRuntime<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  supabaseClient,
  syncEnabled,
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
}: UseSupabaseSessionPullRuntimeOptions<TSession, TBenchmarks, TFeedback>): void {
  useEffect(() => {
    if (!supabaseClient || !syncEnabled) return;
    const client = supabaseClient;
    let cancelled = false;

    async function pullAndMergeSync(reason: 'initial' | 'background'): Promise<void> {
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
        if (cancelled) return;
        if (shouldFullPull) {
          supabaseLastFullPullAtMsRef.current = nowMs;
        }
        supabaseKnownRemoteRowsRef.current = shouldFullPull ? rows : mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, rows);
        supabaseLastRemoteUpdatedAtRef.current =
          latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
        const transientErrorSessionIds = collectTransientErrorSessionIds(rows);
        if (transientErrorSessionIds.length > 0) {
          transientErrorSessionIds.forEach((sessionId) => deletedSessionIdsRef.current.add(sessionId));
          persistDeletedSessionIds(deletedSessionIdsRef.current);
          void Promise.allSettled(transientErrorSessionIds.map((sessionId) => deleteSessionSyncRow(client, profileId, sessionId)));
        }
        const merged = mergeSyncRows(syncStateRef.current, rows);
        if (merged.deletedSessionIds.length > 0) {
          merged.deletedSessionIds.forEach((sessionId) => deletedSessionIdsRef.current.add(sessionId));
          persistDeletedSessionIds(deletedSessionIdsRef.current);
        }
        const filteredMergedSessions = (merged.sessions as TSession[]).map(normalizeRestoredSession).filter(
          (session) => !deletedSessionIdsRef.current.has(session.id) && !isTransientGenerationErrorSessionLike(session),
        );
        if (merged.changed || filteredMergedSessions.length !== (merged.sessions as TSession[]).length) {
          supabaseApplyingRemoteRef.current = true;
          setSessions(filteredMergedSessions);
          setAdaptiveBenchmarks(merged.benchmarks as TBenchmarks);
          setAdaptiveSessionFeedback(merged.feedback as TFeedback);
          window.setTimeout(() => {
            supabaseApplyingRemoteRef.current = false;
          }, 0);
        }
        supabaseInitialPullCompleteRef.current = true;
        setSupabaseInitialPullState({
          key: supabaseSyncIdentity,
          complete: true,
        });

        const postMergeState = {
          ...merged,
          sessions: filteredMergedSessions,
        };
        const { pushed, pushedRows } = await pushSyncRowsDetailed(client, profileId, postMergeState, {
          existingRows: supabaseKnownRemoteRowsRef.current,
        });
        supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, pushedRows);
        supabaseLastRemoteUpdatedAtRef.current =
          latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
        clearPendingCriticalSessionRows((postMergeState.sessions as TSession[]).map((session) => session.id));
        if (cancelled) return;
        setSupabaseSyncStatus({
          enabled: true,
          state: 'synced',
          message: merged.imported > 0 ? `Synced. Imported ${merged.imported} remote item${merged.imported === 1 ? '' : 's'}.` : 'Synced with Supabase.',
          lastSyncedAt: new Date().toISOString(),
          imported: merged.imported,
          pushed,
        });
      } catch (error) {
        if (cancelled) return;
        supabaseInitialPullCompleteRef.current = true;
        setSupabaseInitialPullState({
          key: supabaseSyncIdentity,
          complete: true,
        });
        setSupabaseSyncStatus((current) => ({
          ...current,
          state: 'error',
          message: error instanceof Error ? error.message : 'Supabase sync failed.',
        }));
      } finally {
        supabasePullInFlightRef.current = false;
      }
    }

    void pullAndMergeSync('initial');

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void pullAndMergeSync('background');
    }, SUPABASE_BACKGROUND_PULL_INTERVAL_MS);

    const onFocus = () => {
      void pullAndMergeSync('background');
    };
    const onOnline = () => {
      void pullAndMergeSync('background');
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pullAndMergeSync('background');
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [
    clearPendingCriticalSessionRows,
    deletedSessionIdsRef,
    normalizeRestoredSession,
    profileId,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
    setSessions,
    setSupabaseInitialPullState,
    setSupabaseSyncStatus,
    supabaseApplyingRemoteRef,
    supabaseClient,
    supabaseInitialPullCompleteRef,
    supabaseKnownRemoteRowsRef,
    supabaseLastFullPullAtMsRef,
    supabaseLastRemoteUpdatedAtRef,
    supabasePullInFlightRef,
    supabaseSyncIdentity,
    syncEnabled,
    syncStateRef,
  ]);
}
