import type { SessionTelemetry } from '../types/dictation';

export const SESSION_RETENTION_DAYS = 30;
export const SESSION_RETENTION_MS = SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type RetainableSession = {
  id: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  telemetry?: Pick<SessionTelemetry, 'finishedAt'> | null;
};

export type SessionRetentionPartition<TSession extends RetainableSession> = {
  retainedSessions: TSession[];
  expiredSessions: TSession[];
  expiredSessionIds: Set<string>;
};

export function getSessionRetentionActivityTimestampMs(session: RetainableSession): number {
  for (const value of [session.telemetry?.finishedAt, session.updatedAt, session.createdAt]) {
    const timestamp = parseSessionRetentionTimestampMs(value);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return Number.NaN;
}

export function isSessionRetentionExpirable(session: RetainableSession): boolean {
  return session.status === 'finished' || session.status === 'error';
}

export function isSessionExpiredByRetention(session: RetainableSession, nowMs = Date.now()): boolean {
  if (!isSessionRetentionExpirable(session)) return false;
  const activityTimestampMs = getSessionRetentionActivityTimestampMs(session);
  if (!Number.isFinite(activityTimestampMs)) return false;
  return activityTimestampMs < nowMs - SESSION_RETENTION_MS;
}

export function partitionSessionsByRetention<TSession extends RetainableSession>(
  sessions: readonly TSession[],
  nowMs = Date.now(),
): SessionRetentionPartition<TSession> {
  const retainedSessions: TSession[] = [];
  const expiredSessions: TSession[] = [];
  const expiredSessionIds = new Set<string>();

  for (const session of sessions) {
    if (isSessionExpiredByRetention(session, nowMs)) {
      expiredSessions.push(session);
      if (session.id) expiredSessionIds.add(session.id);
    } else {
      retainedSessions.push(session);
    }
  }

  return {
    retainedSessions,
    expiredSessions,
    expiredSessionIds,
  };
}

export function filterSessionsByRetention<TSession extends RetainableSession>(
  sessions: readonly TSession[],
  nowMs = Date.now(),
): TSession[] {
  return partitionSessionsByRetention(sessions, nowMs).retainedSessions;
}

export function pickNewestRetainedSessionId<TSession extends RetainableSession>(
  sessions: readonly TSession[],
): string {
  let newestSessionId = '';
  let newestTimestampMs = Number.NEGATIVE_INFINITY;

  for (const session of sessions) {
    const timestampMs = getSessionRetentionActivityTimestampMs(session);
    if (!session.id || !Number.isFinite(timestampMs)) continue;
    if (timestampMs > newestTimestampMs) {
      newestSessionId = session.id;
      newestTimestampMs = timestampMs;
    }
  }

  return newestSessionId || (sessions.find((session) => Boolean(session.id))?.id ?? '');
}

function parseSessionRetentionTimestampMs(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const timestampMs = Date.parse(value);
  return Number.isFinite(timestampMs) ? timestampMs : Number.NaN;
}
