import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DictaSyncState } from '../../core/supabaseSync';
import { loadDeletedSessionIds } from '../sessionPersistenceDeletedIds';
import type {
  PersistableSession,
  SupabaseInitialPullState,
  UseSessionPersistenceSyncOptions,
} from './sessionPersistenceSyncTypes';
import type { SessionPersistenceLocalPayloadStore } from './sessionPersistenceLocalPayloadStore';

type UseSessionLocalPayloadHydrationOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  localPayloadStore: SessionPersistenceLocalPayloadStore<TSession, TBenchmarks, TFeedback> | undefined;
  profileStorageReadyForEffectiveProfile: boolean;
  localPayloadProfileId: string;
  localPayloadReadyForEffectiveProfile: boolean;
  setLocalPayloadReadyProfileId: Dispatch<SetStateAction<string>>;
  setSessions: Dispatch<SetStateAction<TSession[]>>;
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  setAdaptiveBenchmarks: Dispatch<SetStateAction<TBenchmarks>>;
  adaptiveBenchmarksRef: MutableRefObject<TBenchmarks>;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<TFeedback>>;
  adaptiveSessionFeedbackRef: MutableRefObject<TFeedback>;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  syncStateRef: MutableRefObject<DictaSyncState>;
  latestSessionsForPersistenceRef: MutableRefObject<TSession[]>;
  pendingHydratedSessionsRef: MutableRefObject<TSession[] | null>;
  lastPersistedSessionsJsonRef: MutableRefObject<string | null>;
  supabaseApplyingRemoteRef: MutableRefObject<boolean>;
  supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
  setSupabaseInitialPullState: Dispatch<SetStateAction<SupabaseInitialPullState>>;
  buildSyncState: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>['buildSyncState'];
  normalizeRestoredSession: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>['normalizeRestoredSession'];
  loadSessionsFallback: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>['loadSessions'];
  loadAdaptiveBenchmarksFallback: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>['loadAdaptiveBenchmarks'];
  loadAdaptiveSessionFeedbackFallback: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>['loadAdaptiveSessionFeedback'];
};

export function useSessionLocalPayloadHydration<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  localPayloadStore,
  profileStorageReadyForEffectiveProfile,
  localPayloadProfileId,
  localPayloadReadyForEffectiveProfile,
  setLocalPayloadReadyProfileId,
  setSessions,
  setActiveSessionId,
  setAdaptiveBenchmarks,
  adaptiveBenchmarksRef,
  setAdaptiveSessionFeedback,
  adaptiveSessionFeedbackRef,
  deletedSessionIdsRef,
  syncStateRef,
  latestSessionsForPersistenceRef,
  pendingHydratedSessionsRef,
  lastPersistedSessionsJsonRef,
  supabaseApplyingRemoteRef,
  supabaseInitialPullCompleteRef,
  setSupabaseInitialPullState,
  buildSyncState,
  normalizeRestoredSession,
  loadSessionsFallback,
  loadAdaptiveBenchmarksFallback,
  loadAdaptiveSessionFeedbackFallback,
}: UseSessionLocalPayloadHydrationOptions<TSession, TBenchmarks, TFeedback>): void {
  useEffect(() => {
    if (!localPayloadStore || !profileStorageReadyForEffectiveProfile || localPayloadReadyForEffectiveProfile) return;
    const store = localPayloadStore;

    let cancelled = false;
    async function hydrate(): Promise<void> {
      try {
        const hydrated = await store.migrateAndLoad(localPayloadProfileId);
        if (cancelled) return;
        applyHydratedLocalState({
          sessions: hydrated.sessions.map(normalizeRestoredSession),
          benchmarks: hydrated.benchmarks,
          feedback: hydrated.feedback,
          deletedSessionIds: hydrated.deletedSessionIds,
        });
      } catch (error) {
        console.warn('[DictaStorage] IndexedDB hydration failed; falling back to legacy localStorage for this load.', error);
        if (cancelled) return;
        applyHydratedLocalState({
          sessions: loadSessionsFallback(),
          benchmarks: loadAdaptiveBenchmarksFallback(),
          feedback: loadAdaptiveSessionFeedbackFallback(),
          deletedSessionIds: loadDeletedSessionIds(),
        });
      }
    }

    function applyHydratedLocalState({
      sessions,
      benchmarks,
      feedback,
      deletedSessionIds,
    }: {
      sessions: TSession[];
      benchmarks: TBenchmarks;
      feedback: TFeedback;
      deletedSessionIds: Set<string>;
    }): void {
      const visibleSessions = sessions.filter((session) => !deletedSessionIds.has(session.id));
      latestSessionsForPersistenceRef.current = visibleSessions;
      pendingHydratedSessionsRef.current = visibleSessions;
      lastPersistedSessionsJsonRef.current = null;
      deletedSessionIdsRef.current = deletedSessionIds;
      adaptiveBenchmarksRef.current = benchmarks;
      adaptiveSessionFeedbackRef.current = feedback;
      syncStateRef.current = buildSyncState(visibleSessions, benchmarks, feedback);
      supabaseApplyingRemoteRef.current = false;
      supabaseInitialPullCompleteRef.current = false;
      setSessions(visibleSessions);
      setActiveSessionId(visibleSessions[0]?.id ?? '');
      setAdaptiveBenchmarks(benchmarks);
      setAdaptiveSessionFeedback(feedback);
      setSupabaseInitialPullState({ key: localPayloadProfileId, complete: false });
      queueHydrationReady(() => {
        if (!cancelled) setLocalPayloadReadyProfileId(localPayloadProfileId);
      });
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackRef,
    buildSyncState,
    deletedSessionIdsRef,
    lastPersistedSessionsJsonRef,
    latestSessionsForPersistenceRef,
    pendingHydratedSessionsRef,
    loadAdaptiveBenchmarksFallback,
    loadAdaptiveSessionFeedbackFallback,
    loadSessionsFallback,
    localPayloadProfileId,
    localPayloadReadyForEffectiveProfile,
    localPayloadStore,
    normalizeRestoredSession,
    profileStorageReadyForEffectiveProfile,
    setActiveSessionId,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
    setLocalPayloadReadyProfileId,
    setSessions,
    setSupabaseInitialPullState,
    supabaseApplyingRemoteRef,
    supabaseInitialPullCompleteRef,
    syncStateRef,
  ]);
}

function queueHydrationReady(callback: () => void): void {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }
  void Promise.resolve().then(callback);
}
