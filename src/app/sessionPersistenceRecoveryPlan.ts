import type { SessionTelemetry } from '../types/dictation';
import { compactTelemetryForStorage } from './sessionPersistenceCompaction';

export const SESSION_PERSIST_STORAGE_FULL_TELEMETRY_SESSIONS = 5;
export const SESSION_PERSIST_RECOVERY_MAX_SESSIONS = 50;

type PersistableRecoverySession = {
  id: string;
  updatedAt: string;
  status: string;
  telemetry: SessionTelemetry;
};

type BuildQuotaRecoverySessionsOptions<TSession extends PersistableRecoverySession> = {
  sessions: TSession[];
  activeSessionId: string;
  normalizeSessionForPersistence: (session: TSession) => TSession;
};

export function buildSessionPersistenceQuotaRecoverySessions<TSession extends PersistableRecoverySession>({
  sessions,
  activeSessionId,
  normalizeSessionForPersistence,
}: BuildQuotaRecoverySessionsOptions<TSession>): TSession[] {
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const recoverySessions = sortedSessions.filter(
    (session, index) => index < SESSION_PERSIST_RECOVERY_MAX_SESSIONS || session.id === activeSessionId,
  );

  return recoverySessions.map((session, index) => {
    const normalized = normalizeSessionForPersistence(session);

    return shouldKeepFullTelemetryForRecovery({ session, index, activeSessionId })
      ? normalized
      : {
          ...normalized,
          telemetry: compactTelemetryForStorage(normalized.telemetry),
        };
  });
}

type BuildSessionPersistenceStorageSessionsOptions<TSession extends PersistableRecoverySession> = {
  sessions: TSession[];
  activeSessionId: string;
  normalizeSessionForPersistence: (session: TSession) => TSession;
};

export function buildSessionPersistenceStorageSessions<TSession extends PersistableRecoverySession>({
  sessions,
  activeSessionId,
  normalizeSessionForPersistence,
}: BuildSessionPersistenceStorageSessionsOptions<TSession>): TSession[] {
  const normalizedSessions = sessions.map((session) => normalizeSessionForPersistence(session));
  const sortedSessions = [...normalizedSessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return sortedSessions.map((session, index) => (
    shouldKeepFullTelemetryForStorage({ session, index, activeSessionId })
      ? session
      : {
          ...session,
          telemetry: compactTelemetryForStorage(session.telemetry),
        }
  ));
}

type ShouldKeepFullTelemetryOptions<TSession extends PersistableRecoverySession> = {
  session: TSession;
  index: number;
  activeSessionId: string;
};

export function shouldKeepFullTelemetryForRecovery<TSession extends PersistableRecoverySession>({
  session,
  index,
  activeSessionId,
}: ShouldKeepFullTelemetryOptions<TSession>): boolean {
  return (
    session.id === activeSessionId ||
    index < SESSION_PERSIST_STORAGE_FULL_TELEMETRY_SESSIONS ||
    session.status === 'running' ||
    session.status === 'paused'
  );
}

type ShouldKeepFullTelemetryForStorageOptions<TSession extends PersistableRecoverySession> = {
  session: TSession;
  index: number;
  activeSessionId: string;
};

export function shouldKeepFullTelemetryForStorage<TSession extends PersistableRecoverySession>({
  session,
  index,
  activeSessionId,
}: ShouldKeepFullTelemetryForStorageOptions<TSession>): boolean {
  return shouldKeepFullTelemetryForRecovery({ session, index, activeSessionId });
}
