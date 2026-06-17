import type { SessionTelemetry } from '../types/dictation';
import { asRecord, numberOr } from './sessionNormalizationPrimitives';

export function normalizeRateDistribution(input: unknown): Array<{ rate: number; seconds: number }> {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const candidate = entry as { rate?: unknown; seconds?: unknown };
        const rate = typeof candidate.rate === 'number' ? candidate.rate : Number(candidate.rate);
        const seconds = typeof candidate.seconds === 'number' ? candidate.seconds : Number(candidate.seconds);
        if (!Number.isFinite(rate) || !Number.isFinite(seconds)) return null;
        return { rate, seconds };
      })
      .filter((value): value is { rate: number; seconds: number } => Boolean(value))
      .sort((a, b) => a.rate - b.rate);
  }

  if (typeof input === 'object') {
    const record = input as Record<string, number>;
    return Object.entries(record)
      .map(([rateKey, seconds]) => ({ rate: Number(rateKey), seconds: Number(seconds) }))
      .filter((entry) => Number.isFinite(entry.rate) && Number.isFinite(entry.seconds))
      .sort((a, b) => a.rate - b.rate);
  }

  return [];
}

export function cloneTelemetry(telemetry: unknown): SessionTelemetry {
  if (!telemetry) {
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

  const input = asRecord(telemetry);
  const normalizedRateDistribution = normalizeRateDistribution(input.rateDistribution ?? input.timeAtRate ?? {});
  const liveFrames = Array.isArray(input.liveFrames) ? input.liveFrames : undefined;

  return {
    startedAt: typeof input.startedAt === 'string' ? input.startedAt : '',
    finishedAt: typeof input.finishedAt === 'string' ? input.finishedAt : undefined,
    lagSeries: Array.isArray(input.lagSeries) ? input.lagSeries.filter((value): value is number => typeof value === 'number') : [],
    wpmSeries: Array.isArray(input.wpmSeries) ? input.wpmSeries.filter((value): value is number => typeof value === 'number') : [],
    accuracySeries: Array.isArray(input.accuracySeries)
      ? input.accuracySeries.filter((value): value is number => typeof value === 'number')
      : [],
    actions: Array.isArray(input.actions) ? (input.actions as SessionTelemetry['actions']) : [],
    ttsChunks: Array.isArray(input.ttsChunks) ? (input.ttsChunks as SessionTelemetry['ttsChunks']) : [],
    repeatCount: numberOr(input.repeatCount, 0),
    rateDistribution: normalizedRateDistribution,
    ...(liveFrames ? { liveFrames } : {}),
  } as SessionTelemetry;
}

export function hasFinalizedAttemptTelemetry(telemetry: unknown): boolean {
  const normalized = cloneTelemetry(telemetry);
  return Boolean(normalized.finishedAt || normalized.actions.some((entry) => entry.action === 'submit'));
}
