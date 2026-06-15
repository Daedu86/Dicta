import { describe, expect, it, vi } from 'vitest';
import {
  SESSION_PERSIST_RECOVERY_FULL_TELEMETRY_SESSIONS,
  SESSION_PERSIST_RECOVERY_MAX_SESSIONS,
  buildSessionPersistenceQuotaRecoverySessions,
  shouldKeepFullTelemetryForRecovery,
} from '../src/app/sessionPersistenceRecoveryPlan';
import {
  SESSION_PERSIST_RECOVERY_SERIES_LIMIT,
} from '../src/app/sessionPersistenceCompaction';
import type { SessionTelemetry } from '../src/types/dictation';

type TestSession = {
  id: string;
  updatedAt: string;
  status: 'ready' | 'running' | 'paused' | 'finished';
  telemetry: SessionTelemetry;
  normalized?: boolean;
};

function telemetry(size = 0): SessionTelemetry {
  return {
    startedAt: '2026-06-15T10:00:00.000Z',
    lagSeries: Array.from({ length: size }, (_, index) => index),
    wpmSeries: Array.from({ length: size }, (_, index) => index),
    accuracySeries: Array.from({ length: size }, (_, index) => index),
    actions: [],
    ttsChunks: [],
    repeatCount: 0,
    rateDistribution: [],
  };
}

function session(index: number, overrides: Partial<TestSession> = {}): TestSession {
  return {
    id: `session-${index}`,
    updatedAt: new Date(Date.UTC(2026, 5, 15, 10, 0, index)).toISOString(),
    status: 'finished',
    telemetry: telemetry(SESSION_PERSIST_RECOVERY_SERIES_LIMIT + 5),
    ...overrides,
  };
}

describe('sessionPersistenceRecoveryPlan', () => {
  it('keeps the latest recovery sessions and includes the active session even when older', () => {
    const sessions = Array.from({ length: SESSION_PERSIST_RECOVERY_MAX_SESSIONS + 5 }, (_, index) => session(index));
    const activeSession = sessions[0];
    const normalizeSessionForPersistence = vi.fn((value: TestSession) => ({ ...value, normalized: true }));

    const recoverySessions = buildSessionPersistenceQuotaRecoverySessions({
      sessions,
      activeSessionId: activeSession.id,
      normalizeSessionForPersistence,
    });

    expect(recoverySessions).toHaveLength(SESSION_PERSIST_RECOVERY_MAX_SESSIONS + 1);
    expect(recoverySessions.some((value) => value.id === activeSession.id)).toBe(true);
    expect(recoverySessions[0]?.id).toBe(`session-${SESSION_PERSIST_RECOVERY_MAX_SESSIONS + 4}`);
    expect(normalizeSessionForPersistence).toHaveBeenCalledTimes(SESSION_PERSIST_RECOVERY_MAX_SESSIONS + 1);
    expect(recoverySessions.every((value) => value.normalized)).toBe(true);
  });

  it('keeps full telemetry for active, recent, running, and paused sessions', () => {
    expect(shouldKeepFullTelemetryForRecovery({ session: session(1), index: 100, activeSessionId: 'session-1' })).toBe(true);
    expect(shouldKeepFullTelemetryForRecovery({ session: session(2), index: SESSION_PERSIST_RECOVERY_FULL_TELEMETRY_SESSIONS - 1, activeSessionId: '' })).toBe(true);
    expect(shouldKeepFullTelemetryForRecovery({ session: session(3, { status: 'running' }), index: 100, activeSessionId: '' })).toBe(true);
    expect(shouldKeepFullTelemetryForRecovery({ session: session(4, { status: 'paused' }), index: 100, activeSessionId: '' })).toBe(true);
    expect(shouldKeepFullTelemetryForRecovery({ session: session(5), index: SESSION_PERSIST_RECOVERY_FULL_TELEMETRY_SESSIONS, activeSessionId: '' })).toBe(false);
  });

  it('compacts old finished session telemetry after normalization', () => {
    const oldSession = session(1);
    const sessions = Array.from({ length: SESSION_PERSIST_RECOVERY_FULL_TELEMETRY_SESSIONS }, (_, index) => session(index + 20));
    sessions.push(oldSession);
    const normalizeSessionForPersistence = vi.fn((value: TestSession) => ({
      ...value,
      telemetry: telemetry(SESSION_PERSIST_RECOVERY_SERIES_LIMIT + 10),
      normalized: true,
    }));

    const recoverySessions = buildSessionPersistenceQuotaRecoverySessions({
      sessions,
      activeSessionId: '',
      normalizeSessionForPersistence,
    });
    const compactedOldSession = recoverySessions.find((value) => value.id === oldSession.id);

    expect(compactedOldSession?.normalized).toBe(true);
    expect(compactedOldSession?.telemetry.lagSeries).toHaveLength(SESSION_PERSIST_RECOVERY_SERIES_LIMIT);
    expect(compactedOldSession?.telemetry.lagSeries[0]).toBe(10);
  });
});
