// @vitest-environment jsdom
import { act, createElement, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ADAPTIVE_BENCHMARKS_KEY,
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  SESSION_STORAGE_KEY,
  loadDeletedSessionIds,
  useSessionPersistenceSync,
  type UseSessionPersistenceSyncResult,
} from '../src/app/useSessionPersistenceSync';
import type { SessionTelemetry } from '../src/types/dictation';
import type { DictaSyncConfig, DictaSyncRow, DictaSyncState } from '../src/core/supabaseSync';
import {
  PROFILE_SCOPED_STORAGE_MARKER_KEY,
  profileScopedStorageKey,
} from '../src/core/profileScopedStorage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type TestSession = {
  id: string;
  updatedAt: string;
  status: 'ready' | 'running' | 'paused' | 'finished' | 'error';
  telemetry: SessionTelemetry;
  marker?: string;
};

type TestBenchmarks = Record<string, Record<string, unknown>>;
type TestFeedback = Record<string, Record<string, unknown[]>>;
type RuntimeSnapshot = UseSessionPersistenceSyncResult<TestSession, TestFeedback>;

const disabledSyncConfig: DictaSyncConfig = {
  enabled: false,
  authRequired: false,
  url: '',
  anonKey: '',
  profileId: '',
  legacyProfileId: '',
};

const authSyncConfig: DictaSyncConfig = {
  enabled: false,
  authRequired: true,
  url: 'https://example.supabase.co',
  anonKey: 'anon-key',
  profileId: '',
  legacyProfileId: '',
};

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function flushReactWork(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function telemetry(): SessionTelemetry {
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

function session(id: string, marker = id): TestSession {
  return {
    id,
    marker,
    status: 'ready',
    updatedAt: `2026-06-04T12:00:0${id.length}.000Z`,
    telemetry: telemetry(),
  };
}

function loadTestSessions(): TestSession[] {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as TestSession[]) : [];
}

function loadTestBenchmarks(): TestBenchmarks {
  const raw = window.localStorage.getItem(ADAPTIVE_BENCHMARKS_KEY);
  return raw ? (JSON.parse(raw) as TestBenchmarks) : {};
}

function loadTestFeedback(): TestFeedback {
  const raw = window.localStorage.getItem(ADAPTIVE_SESSION_FEEDBACK_KEY);
  return raw ? (JSON.parse(raw) as TestFeedback) : {};
}

function buildTestSyncState(
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

function normalizeTestSession(session: TestSession): TestSession {
  return session;
}

function renderHarness({
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
    root.render(createElement(Harness));
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

function createDeferredSupabaseClient(remoteRows: DictaSyncRow[]): {
  client: SupabaseClient;
  resolvePull: () => void;
} {
  let resolvePull: (value: { data: DictaSyncRow[]; error: null }) => void = () => undefined;
  const pullResult = new Promise<{ data: DictaSyncRow[]; error: null }>((resolve) => {
    resolvePull = resolve;
  });
  const query = {
    select: () => query,
    eq: () => query,
    gt: () => query,
    order: () => pullResult,
    upsert: async () => ({ error: null }),
  };
  return {
    client: {
      from: () => query,
    } as unknown as SupabaseClient,
    resolvePull: () => resolvePull({ data: remoteRows, error: null }),
  };
}

describe('useSessionPersistenceSync', () => {
  it('schedules debounced normal session writes and persists immediately on final paths', () => {
    const firstSession = session('s1');
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const { getRuntime } = renderHarness({ initialSessions: [firstSession] });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1500);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? '[]')).toEqual([firstSession]);

    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    const finalSession = session('s2');
    act(() => {
      getRuntime().persistAndPushSessionsNow([finalSession]);
    });
    expect(JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) ?? '[]')).toEqual([finalSession]);
  });

  it('switches profile-scoped storage before marking localStorage ready', async () => {
    const oldSession = session('old', 'old-profile');
    const newSession = session('new', 'new-profile');
    window.localStorage.setItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, 'profile-a');
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([oldSession]));
    window.localStorage.setItem(
      profileScopedStorageKey('profile-b'),
      JSON.stringify({
        [SESSION_STORAGE_KEY]: JSON.stringify([newSession]),
        [ADAPTIVE_BENCHMARKS_KEY]: JSON.stringify({ input2: { de: { marker: 'bench-b' } } }),
        [ADAPTIVE_SESSION_FEEDBACK_KEY]: JSON.stringify({ input2: { de: [] } }),
      }),
    );
    const onProfileStorageSwitched = vi.fn();

    const { getRuntime, getSessions, getActiveSessionId } = renderHarness({
      initialSessions: [oldSession],
      syncConfig: authSyncConfig,
      effectiveProfileId: 'profile-b',
      onProfileStorageSwitched,
    });
    await flushReactWork();

    expect(getRuntime().localStorageReadyForEffectiveProfile).toBe(true);
    expect(getSessions()).toEqual([newSession]);
    expect(getActiveSessionId()).toBe('new');
    expect(onProfileStorageSwitched).toHaveBeenCalledTimes(1);
  });

  it('persists local tombstones when deleting sessions', async () => {
    const firstSession = session('s1');
    const secondSession = session('s2');
    const { getRuntime, getSessions } = renderHarness({ initialSessions: [firstSession, secondSession] });

    act(() => {
      getRuntime().deleteSessionAndSync('s1');
    });
    await flushReactWork();

    expect(getSessions()).toEqual([secondSession]);
    expect(loadDeletedSessionIds().has('s1')).toBe(true);
  });

  it('keeps Supabase initial sync pending until remote tombstones are applied', async () => {
    vi.useRealTimers();
    const staleSession = session('stale', 'stale-local');
    const remoteSession = {
      ...session('remote', 'remote-current'),
      updatedAt: '2026-06-05T12:00:00.000Z',
    };
    window.localStorage.setItem(PROFILE_SCOPED_STORAGE_MARKER_KEY, 'profile-b');
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify([staleSession]));
    const remoteRows: DictaSyncRow[] = [
      {
        profile_id: 'profile-b',
        item_type: 'session',
        item_key: 'stale',
        payload: {
          id: 'stale',
          deleted: true,
          deletedAt: '2026-06-05T11:00:00.000Z',
          updatedAt: '2026-06-05T11:00:00.000Z',
        },
        updated_at: '2026-06-05T11:00:00.000Z',
      },
      {
        profile_id: 'profile-b',
        item_type: 'session',
        item_key: 'remote',
        payload: remoteSession,
        updated_at: remoteSession.updatedAt,
      },
    ];

    const fakeSupabase = createDeferredSupabaseClient(remoteRows);
    const { getRuntime, getSessions } = renderHarness({
      initialSessions: [staleSession],
      syncConfig: authSyncConfig,
      effectiveProfileId: 'profile-b',
      supabaseClient: fakeSupabase.client,
    });

    expect(getRuntime().supabaseInitialSyncPending).toBe(true);
    await act(async () => {
      fakeSupabase.resolvePull();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushReactWork();
    await flushReactWork();
    await flushReactWork();

    expect(getRuntime().supabaseInitialSyncPending).toBe(false);
    expect(getSessions()).toEqual([remoteSession]);
    expect(loadDeletedSessionIds().has('stale')).toBe(true);
  });
});
