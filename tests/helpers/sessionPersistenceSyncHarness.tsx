import { act, createElement, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ADAPTIVE_BENCHMARKS_KEY,
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  SESSION_STORAGE_KEY,
  useSessionPersistenceSync,
  type UseSessionPersistenceSyncResult,
} from '../../src/app/useSessionPersistenceSync';
import type { DictaSyncConfig, DictaSyncState } from '../../src/core/supabaseSync';
import type { SessionTelemetry } from '../../src/types/dictation';

export {
  createDeferredSupabaseClient,
  createKeepaliveSupabaseClient,
} from './sessionPersistenceSupabaseClients';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export type TestSession = {
  id: string;
  updatedAt: string;
  status: 'ready' | 'running' | 'paused' | 'finished' | 'error';
  telemetry: SessionTelemetry;
  marker?: string;
};

export type TestBenchmarks = Record<string, Record<string, unknown>>;
export type TestFeedback = Record<string, Record<string, unknown[]>>;
export type RuntimeSnapshot = UseSessionPersistenceSyncResult<TestSession, TestFeedback>;

export const disabledSyncConfig: DictaSyncConfig = {
  enabled: false,
  authRequired: false,
  url: '',
  anonKey: '',
  profileId: '',
  legacyProfileId: '',
};

export const authSyncConfig: DictaSyncConfig = {
  enabled: false,
  authRequired: true,
  url: 'https://example.supabase.co',
  anonKey: 'anon-key',
  profileId: '',
  legacyProfileId: '',
};

let host: HTMLDivElement | null = null;
let root: Root | null = null;

export function setupSessionPersistenceSyncHarness(): void {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
}

export function cleanupSessionPersistenceSyncHarness(): void {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  host?.remove();
  host = null;
}

function getRoot(): Root {
  if (!root) throw new Error('Session persistence sync harness root is not mounted.');
  return root;
}

export async function flushReactWork(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

export function telemetry(): SessionTelemetry {
  return {
    startedAt: '',
    lagSeries: [],
    wpmSeries: [],
    accuracySeries: [],
    actions: [],
    ttsChunks: [],
    repeatCount: 0,
    rateDistribution: [],
  };
}

export function session(id: string, marker = id): TestSession {
  return {
    id,
    marker,
    status: 'ready',
    updatedAt: `2026-06-04T12:00:0${id.length}.000Z`,
    telemetry: telemetry(),
  };
}

export function loadTestSessions(): TestSession[] {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as TestSession[]) : [];
}

export function loadTestBenchmarks(): TestBenchmarks {
  const raw = window.localStorage.getItem(ADAPTIVE_BENCHMARKS_KEY);
  return raw ? (JSON.parse(raw) as TestBenchmarks) : {};
}

export function loadTestFeedback(): TestFeedback {
  const raw = window.localStorage.getItem(ADAPTIVE_SESSION_FEEDBACK_KEY);
  return raw ? (JSON.parse(raw) as TestFeedback) : {};
}

export function buildTestSyncState(
  sessions: TestSession[],
  benchmarks: TestBenchmarks,
  feedback: TestFeedback,
): DictaSyncState {
  return {
    sessions,
    benchmarks,
    feedback,
  };
}

export function normalizeTestSession(session: TestSession): TestSession {
  return session;
}

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
} {
  let runtime: RuntimeSnapshot | null = null;
  let latestSessions: TestSession[] = [];
  let latestActiveSessionId = '';

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
      onQuotaRecovered: () => undefined,
      onProfileStorageSwitched,
    });
    return null;
  }

  act(() => {
    getRoot().render(createElement(Harness));
  });

  return {
    getRuntime: () => {
      if (!runtime) throw new Error('Runtime not rendered.');
      return runtime;
    },
    getSessions: () => latestSessions,
    getActiveSessionId: () => latestActiveSessionId,
  };
}
