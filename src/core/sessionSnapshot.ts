import { cloneTelemetry, normalizeSessionModeData } from './sessionNormalization';
import { estimateSessionVoiceDurationSec } from './sessionDuration';
import type { SessionModeData } from './sessionNormalization';
import { BROWSER_TTS_SESSION_INPUT_MODE } from './sessionInputModes';

export type SessionSnapshot = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  inputMode: string;
  difficulty?: string;
  status?: string;
  generationError?: string;
  modeData: SessionModeData;
  metrics?: unknown;
  telemetrySummary: {
    actions: number;
    ttsChunks: number;
    repeatCount: number;
    sampleCount: number;
    averageLagSec: number | null;
    averageWpm: number | null;
    averageAccuracy: number | null;
    durationSec: number | null;
    rateDistribution: Array<{ rate: number; seconds: number }>;
  };
};

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

type UnknownRecord = Record<string, unknown>;

export function buildSessionSnapshot(session: unknown): SessionSnapshot {
  const input: UnknownRecord = session && typeof session === 'object' ? (session as UnknownRecord) : {};
  const telemetry = cloneTelemetry(input.telemetry);

  const durationSec = estimateSessionVoiceDurationSec({ ...input, telemetry });

  return {
    id: typeof input.id === 'string' ? input.id : '',
    name: typeof input.name === 'string' ? input.name : '',
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : undefined,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : undefined,
    inputMode: typeof input.inputMode === 'string' ? input.inputMode : BROWSER_TTS_SESSION_INPUT_MODE,
    difficulty: typeof input.difficulty === 'string' ? input.difficulty : undefined,
    status: typeof input.status === 'string' ? input.status : undefined,
    generationError: typeof input.generationError === 'string' && input.generationError.trim() ? input.generationError : undefined,
    modeData: normalizeSessionModeData(session),
    metrics: input.metrics,
    telemetrySummary: {
      actions: telemetry.actions.length,
      ttsChunks: telemetry.ttsChunks.length,
      repeatCount: telemetry.repeatCount,
      sampleCount: Math.max(telemetry.lagSeries.length, telemetry.wpmSeries.length, telemetry.accuracySeries.length),
      averageLagSec: average(telemetry.lagSeries),
      averageWpm: average(telemetry.wpmSeries),
      averageAccuracy: average(telemetry.accuracySeries),
      durationSec,
      rateDistribution: telemetry.rateDistribution,
    },
  };
}

export function sessionSnapshotJson(session: unknown): string {
  return JSON.stringify(buildSessionSnapshot(session), null, 2);
}
