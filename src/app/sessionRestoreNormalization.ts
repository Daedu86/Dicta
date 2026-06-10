import type { SessionInputMode } from '../core/sessionInputModes';

type RestorableSession = {
  inputMode: SessionInputMode;
  ttsEnvironment?: unknown;
  telemetry: unknown;
  status: unknown;
};

type SessionRestoreNormalizationDependencies<TSession extends RestorableSession, TTelemetry> = {
  browserTtsInputMode: SessionInputMode;
  cloneTelemetry: (telemetry: TSession['telemetry']) => TTelemetry;
  normalizeBrowserTtsEnvironmentFingerprint: (environment: TSession['ttsEnvironment']) => TSession['ttsEnvironment'];
  normalizeRestoredSessionStatus: (status: TSession['status'], telemetry: TTelemetry) => TSession['status'];
  normalizeSessionForPersistence: (
    session: TSession & {
      telemetry: TTelemetry;
      status: TSession['status'];
      ttsEnvironment: TSession['ttsEnvironment'] | undefined;
    },
  ) => TSession;
};

export function normalizeRestoredStoredSession<TSession extends RestorableSession, TTelemetry>(
  session: TSession,
  dependencies: SessionRestoreNormalizationDependencies<TSession, TTelemetry>,
): TSession {
  const telemetry = dependencies.cloneTelemetry(session.telemetry);

  return dependencies.normalizeSessionForPersistence({
    ...session,
    ttsEnvironment:
      session.inputMode === dependencies.browserTtsInputMode
        ? dependencies.normalizeBrowserTtsEnvironmentFingerprint(session.ttsEnvironment)
        : undefined,
    telemetry,
    status: dependencies.normalizeRestoredSessionStatus(session.status, telemetry),
  });
}
