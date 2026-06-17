import {
  ADAPTIVE_BENCHMARKS_KEY,
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  SESSION_STORAGE_KEY,
} from '../../src/app/useSessionPersistenceSync';
import type { DictaSyncState } from '../../src/core/supabaseSync';
import type { SessionTelemetry } from '../../src/types/dictation';
import type { TestBenchmarks, TestFeedback, TestSession } from './sessionPersistenceSyncHarnessTypes';

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
