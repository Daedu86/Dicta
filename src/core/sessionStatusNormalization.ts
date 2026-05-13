import type { SessionTelemetry } from '../types/dictation';

export type PersistedSessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';

export function normalizeRestoredSessionStatus(status: PersistedSessionStatus, telemetry: SessionTelemetry): PersistedSessionStatus {
  if (status === 'error') return 'error';
  if (telemetry.finishedAt) return 'finished';
  if (status === 'running') return 'paused';
  return status;
}

export function normalizeLiveSessionStatusForPersistence(
  status: PersistedSessionStatus,
  telemetry: SessionTelemetry,
  isActuallyRunning: boolean,
): PersistedSessionStatus {
  if (status === 'error') return 'error';
  if (telemetry.finishedAt) return 'finished';
  if (status === 'running' && !isActuallyRunning) return 'paused';
  return status;
}
