import { describe, expect, it } from 'vitest';
import {
  SESSION_RETENTION_DAYS,
  getSessionRetentionActivityTimestampMs,
  isSessionExpiredByRetention,
  partitionSessionsByRetention,
  pickNewestRetainedSessionId,
  type RetainableSession,
} from '../src/app/sessionRetentionPolicy';

const NOW_MS = Date.parse('2026-06-18T12:00:00.000Z');

function session(overrides: Partial<RetainableSession> = {}): RetainableSession {
  return {
    id: 'session-1',
    status: 'finished',
    updatedAt: '2026-06-01T12:00:00.000Z',
    telemetry: {},
    ...overrides,
  };
}

describe('sessionRetentionPolicy', () => {
  it('expires finished and error sessions older than the 30-day retention window', () => {
    const finished = session({ id: 'finished-old', status: 'finished', updatedAt: '2026-05-18T11:59:59.999Z' });
    const error = session({ id: 'error-old', status: 'error', updatedAt: '2026-05-18T11:59:59.999Z' });

    expect(isSessionExpiredByRetention(finished, NOW_MS)).toBe(true);
    expect(isSessionExpiredByRetention(error, NOW_MS)).toBe(true);
    expect(SESSION_RETENTION_DAYS).toBe(30);
  });

  it('keeps finished and error sessions inside the retention window', () => {
    const finished = session({ status: 'finished', updatedAt: '2026-05-19T12:00:00.000Z' });
    const error = session({ status: 'error', updatedAt: '2026-05-19T12:00:00.000Z' });

    expect(isSessionExpiredByRetention(finished, NOW_MS)).toBe(false);
    expect(isSessionExpiredByRetention(error, NOW_MS)).toBe(false);
  });

  it('keeps pending or active sessions regardless of age', () => {
    for (const status of ['ready', 'running', 'paused']) {
      expect(
        isSessionExpiredByRetention(session({ status, updatedAt: '2026-01-01T00:00:00.000Z' }), NOW_MS),
      ).toBe(false);
    }
  });

  it('uses finishedAt before updatedAt before createdAt', () => {
    const withFinishedAt = session({
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      telemetry: { finishedAt: '2026-06-10T00:00:00.000Z' },
    });
    const withUpdatedAt = session({
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-06-09T00:00:00.000Z',
      telemetry: {},
    });
    const withCreatedAt = session({
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: undefined,
      telemetry: {},
    });

    expect(getSessionRetentionActivityTimestampMs(withFinishedAt)).toBe(Date.parse('2026-06-10T00:00:00.000Z'));
    expect(getSessionRetentionActivityTimestampMs(withUpdatedAt)).toBe(Date.parse('2026-06-09T00:00:00.000Z'));
    expect(getSessionRetentionActivityTimestampMs(withCreatedAt)).toBe(Date.parse('2026-06-08T00:00:00.000Z'));
  });

  it('keeps sessions with invalid timestamps', () => {
    expect(isSessionExpiredByRetention(session({ updatedAt: 'not-a-date', telemetry: {} }), NOW_MS)).toBe(false);
  });

  it('partitions retained and expired sessions and picks the newest retained fallback', () => {
    const old = session({ id: 'old', updatedAt: '2026-05-01T00:00:00.000Z' });
    const newer = session({ id: 'newer', updatedAt: '2026-06-12T00:00:00.000Z' });
    const newest = session({ id: 'newest', updatedAt: '2026-06-14T00:00:00.000Z' });

    const partition = partitionSessionsByRetention([old, newer, newest], NOW_MS);

    expect(partition.expiredSessionIds.has('old')).toBe(true);
    expect(partition.retainedSessions.map((item) => item.id)).toEqual(['newer', 'newest']);
    expect(pickNewestRetainedSessionId(partition.retainedSessions)).toBe('newest');
  });
});
