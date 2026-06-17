import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { DictaSyncState } from '../../core/supabaseSync';
import type { PersistableSession } from './sessionPersistenceSyncTypes';

export function useSupabaseInitialSyncPendingRef(
  supabaseInitialSyncPending: boolean,
  supabaseInitialSyncPendingRef: MutableRefObject<boolean>,
): void {
  useEffect(() => {
    supabaseInitialSyncPendingRef.current = supabaseInitialSyncPending;
  }, [supabaseInitialSyncPending, supabaseInitialSyncPendingRef]);
}

export function useSessionPersistenceSyncStateRef<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  sessions,
  adaptiveBenchmarks,
  adaptiveSessionFeedback,
  buildSyncState,
  syncStateRef,
}: {
  sessions: TSession[];
  adaptiveBenchmarks: TBenchmarks;
  adaptiveSessionFeedback: TFeedback;
  buildSyncState: (sessions: TSession[], benchmarks: TBenchmarks, feedback: TFeedback) => DictaSyncState;
  syncStateRef: MutableRefObject<DictaSyncState>;
}): void {
  useEffect(() => {
    syncStateRef.current = buildSyncState(sessions, adaptiveBenchmarks, adaptiveSessionFeedback);
  }, [adaptiveBenchmarks, adaptiveSessionFeedback, buildSyncState, sessions, syncStateRef]);
}
