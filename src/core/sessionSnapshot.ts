import { cloneTelemetry, normalizeSessionModeData } from './sessionNormalization';
import type { SessionModeData } from './sessionNormalization';

export type SessionSnapshot = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  inputMode: string;
  difficulty?: string;
  status?: string;
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

export function buildSessionSnapshot(session: unknown): SessionSnapshot {
  const input = session && typeof session === 'object' ? (session as any) : {};
  const telemetry = cloneTelemetry(input.telemetry);

  const durationSec =
    telemetry.startedAt && telemetry.finishedAt
      ? (new Date(telemetry.finishedAt).getTime() - new Date(telemetry.startedAt).getTime()) / 1000
      : null;

  return {
    id: input.id ?? '',
    name: input.name ?? '',
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    inputMode: input.inputMode ?? 'input1',
    difficulty: input.difficulty,
    status: input.status,
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

