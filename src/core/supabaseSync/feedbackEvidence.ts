import { asRecord, getStringField, normalizeAccuracy, numberFrom } from './records';
import { compareTimestamp, timestampFrom } from './timestamps';
import { isValidSyncRow } from './rowValidation';
import type { DictaSyncRow } from './types';

export type CompletedFeedbackEvidence = {
  sessionId: string;
  completedAt: string;
  startedAt: string | null;
  lagSeries: number[];
  wpmSeries: number[];
  accuracySeries: number[];
  lagSec: number | null;
  wpm: number | null;
  accuracy: number | null;
  rate: number | null;
};

export function collectCompletedFeedbackEvidence(rows: DictaSyncRow[]): Map<string, CompletedFeedbackEvidence> {
  const bySessionId = new Map<string, CompletedFeedbackEvidence>();
  for (const row of rows) {
    if (!isValidSyncRow(row) || row.item_type !== 'feedback') continue;
    const sessionId = getStringField(row.payload, 'sessionId');
    if (!sessionId || sessionId !== row.item_key) continue;
    const completedAt =
      timestampFrom(asRecord(row.payload).completedAt) ??
      timestampFrom(asRecord(row.payload).createdAt) ??
      timestampFrom(row.updated_at);
    if (!completedAt) continue;
    const evidence = deriveCompletedFeedbackEvidence(row.payload, sessionId, completedAt);

    const previous = bySessionId.get(sessionId);
    if (!previous || compareTimestamp(completedAt, previous.completedAt) > 0) {
      bySessionId.set(sessionId, evidence);
    }
  }
  return bySessionId;
}

function deriveCompletedFeedbackEvidence(
  payload: unknown,
  sessionId: string,
  completedAt: string,
): CompletedFeedbackEvidence {
  const benchmarkAfter = asRecord(asRecord(payload).benchmarkAfter);
  const samples = getFeedbackTimelineSamples(payload, sessionId);
  const lastSample = samples.at(-1) ?? null;
  const fallbackAccuracy = normalizeAccuracy(numberFrom(benchmarkAfter.averageAccuracy));
  return {
    sessionId,
    completedAt,
    startedAt: samples[0]?.timestampMs ? new Date(samples[0].timestampMs).toISOString() : null,
    lagSeries: samples.map((sample) => sample.lagSec),
    wpmSeries: samples.map((sample) => sample.wpm),
    accuracySeries: samples.map((sample) => sample.accuracy),
    lagSec: lastSample?.lagSec ?? numberFrom(benchmarkAfter.stableAverageLagSec ?? benchmarkAfter.averageLagSec),
    wpm: lastSample?.wpm ?? numberFrom(benchmarkAfter.averageWpm),
    accuracy: lastSample?.accuracy ?? fallbackAccuracy,
    rate: lastSample?.rate ?? numberFrom(benchmarkAfter.preferredPlaybackRate),
  };
}

type FeedbackTimelineSample = {
  timestampMs: number;
  lagSec: number;
  wpm: number;
  accuracy: number;
  rate: number;
};

function getFeedbackTimelineSamples(payload: unknown, sessionId: string): FeedbackTimelineSample[] {
  const benchmarkAfter = asRecord(asRecord(payload).benchmarkAfter);
  const timeline = Array.isArray(benchmarkAfter.timeline) ? benchmarkAfter.timeline : [];
  return timeline
    .map((entry) => normalizeTimelineSample(entry, sessionId))
    .filter((sample): sample is FeedbackTimelineSample => Boolean(sample))
    .sort((a, b) => a.timestampMs - b.timestampMs);
}

function normalizeTimelineSample(entry: unknown, sessionId: string): FeedbackTimelineSample | null {
  const record = asRecord(entry);
  if (getStringField(record, 'sessionId') !== sessionId) return null;
  const timestampMs = numberFrom(record.timestampMs);
  const lagSec = numberFrom(record.stableLagSec ?? record.lagSec);
  const wpm = numberFrom(record.wpm);
  const rawAccuracy = numberFrom(record.accuracy);
  const rate = numberFrom(record.playbackRate);
  if (timestampMs === null || lagSec === null || wpm === null || rawAccuracy === null) return null;
  return {
    timestampMs,
    lagSec,
    wpm,
    accuracy: normalizeAccuracy(rawAccuracy) ?? 0,
    rate: rate ?? 1,
  };
}
