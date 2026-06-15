import type { SessionTelemetry } from '../types/dictation';

export const SESSION_PERSIST_RECOVERY_SERIES_LIMIT = 120;
export const SESSION_PERSIST_RECOVERY_ACTION_LIMIT = 160;
export const SESSION_PERSIST_RECOVERY_TTS_CHUNK_LIMIT = 80;
export const SESSION_PERSIST_RECOVERY_RATE_DISTRIBUTION_LIMIT = 40;

export function compactTelemetryForStorage(telemetry: SessionTelemetry): SessionTelemetry {
  return {
    ...telemetry,
    lagSeries: telemetry.lagSeries.slice(-SESSION_PERSIST_RECOVERY_SERIES_LIMIT),
    wpmSeries: telemetry.wpmSeries.slice(-SESSION_PERSIST_RECOVERY_SERIES_LIMIT),
    accuracySeries: telemetry.accuracySeries.slice(-SESSION_PERSIST_RECOVERY_SERIES_LIMIT),
    actions: telemetry.actions.slice(-SESSION_PERSIST_RECOVERY_ACTION_LIMIT),
    ttsChunks: telemetry.ttsChunks.slice(-SESSION_PERSIST_RECOVERY_TTS_CHUNK_LIMIT),
    rateDistribution: telemetry.rateDistribution.slice(-SESSION_PERSIST_RECOVERY_RATE_DISTRIBUTION_LIMIT),
  };
}
