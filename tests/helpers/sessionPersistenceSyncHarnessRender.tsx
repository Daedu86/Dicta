import { act, createElement, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { pruneAdaptiveSessionFeedbackBySessionIds } from '../../src/app/adaptiveSessionFeedbackRetention';
import { useSessionPersistenceSync } from '../../src/app/useSessionPersistenceSync';
import type { DictaSyncConfig } from '../../src/core/supabaseSync';
import { disabledSyncConfig } from './sessionPersistenceSyncHarnessConfig';
import {
  buildTestSyncState,
  loadTestBenchmarks,
  loadTestFeedback,
  loadTestSessions,
  normalizeTestSession,
} from './sessionPersistenceSyncHarnessFixtures';
import { getSessionPersistenceHarnessRoot } from './sessionPersistenceSyncHarnessLifecycle';
import type {
  RuntimeSnapshot,
  TestBenchmarks,
  TestFeedback,
  TestSession,
} from './sessionPersistenceSyncHarnessTypes';

export function renderHarness({
  initialSessions,
  syncConfig = disabledSyncConfig,
  effectiveProfileId = '',
  supabaseClient = null,
  onProfileStorageSwitched = () => undefined,
}: {
  initialSessions: TestSession[];
  syncConfig?: DictaSyncConfig;
  effectiveProfileId?: string;
  supabaseClient?: SupabaseClient | null;
  onProfileStorageSwitched?: () => void;
}): {
  getRuntime: () => RuntimeSnapshot;
  getSessions: () => TestSession[];
  getActiveSessionId: () => string;
  getFeedback: () => TestFeedback;
} {
  let runtime: RuntimeSnapshot | null = null;
  let latestSessions: TestSession[] = [];
  let latestActiveSessionId = '';
  let latestFeedback: TestFeedback = {};

  function Harness() {
    const [sessions, setSessions] = useState<TestSession[]>(initialSessions);
    const [activeSessionId, setActiveSessionId] = useState(initialSessions[0]?.id ?? '');
    const [benchmarks, setBenchmarks] = useState<TestBenchmarks>(() => loadTestBenchmarks());
    const benchmarksRef = useRef(benchmarks);
    benchmarksRef.current = benchmarks;
    const [feedback, setFeedback] = useState<TestFeedback>(() => loadTestFeedback());
    const feedbackRef = useRef(feedback);
    feedbackRef.current = feedback;

    latestSessions = sessions;
    latestActiveSessionId = activeSessionId;
    latestFeedback = feedback;
    runtime = useSessionPersistenceSync({
      sessions,
      setSessions,
      activeSessionId,
      setActiveSessionId,
      syncConfig,
      supabaseClient,
      effectiveProfileId,
      adaptiveBenchmarks: benchmarks,
      setAdaptiveBenchmarks: setBenchmarks,
      adaptiveBenchmarksRef: benchmarksRef,
      adaptiveSessionFeedback: feedback,
      setAdaptiveSessionFeedback: setFeedback,
      adaptiveSessionFeedbackRef: feedbackRef,
      loadSessions: loadTestSessions,
      loadAdaptiveBenchmarks: loadTestBenchmarks,
      loadAdaptiveSessionFeedback: loadTestFeedback,
      normalizeSessionForPersistence: normalizeTestSession,
      normalizeRestoredSession: normalizeTestSession,
      buildSyncState: buildTestSyncState,
      pruneAdaptiveSessionFeedbackForDeletedSessions: pruneAdaptiveSessionFeedbackBySessionIds,
      onQuotaRecovered: () => undefined,
      onProfileStorageSwitched,
    });
    return null;
  }

  act(() => {
    getSessionPersistenceHarnessRoot().render(createElement(Harness));
  });

  return {
    getRuntime: () => {
      if (!runtime) throw new Error('Runtime not rendered.');
      return runtime;
    },
    getSessions: () => latestSessions,
    getActiveSessionId: () => latestActiveSessionId,
    getFeedback: () => latestFeedback,
  };
}
