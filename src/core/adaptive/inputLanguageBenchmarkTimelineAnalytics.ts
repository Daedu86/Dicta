import type {
  AdaptiveTimelinePoint,
  RateAccuracyBucket,
} from './types';
import {
  average,
  clamp01,
  normalizeAccuracy,
} from './inputLanguageBenchmarkMath';

export function computeRateAccuracyBuckets(samples: AdaptiveTimelinePoint[]): RateAccuracyBucket[] {
  const buckets = new Map<number, AdaptiveTimelinePoint[]>();
  for (const sample of samples) {
    const rate = Number(sample.playbackRate.toFixed(2));
    buckets.set(rate, [...(buckets.get(rate) ?? []), sample]);
  }
  return [...buckets.entries()]
    .map(([rate, entries]) => ({
      rate,
      seconds: entries.length,
      averageAccuracy: average(entries.map((entry) => entry.accuracy)),
      averageLagSec: average(entries.map((entry) => entry.lagSec)),
      averageWpm: average(entries.map((entry) => entry.wpm)),
      sampleCount: entries.length,
    }))
    .sort((a, b) => a.rate - b.rate);
}

export function computeRecoveryScore(timeline: AdaptiveTimelinePoint[]): number {
  if (timeline.length < 2) return 0;
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const accuracyGain = normalizeAccuracy(last.accuracy) - normalizeAccuracy(first.accuracy);
  const lagGain = Math.abs(first.lagSec) - Math.abs(last.lagSec);
  return clamp01(0.5 + accuracyGain * 0.7 + lagGain / 8);
}

export function computeTimeToRecoveryMs(timeline: AdaptiveTimelinePoint[]): number | null {
  const firstStruggle = timeline.find((point) => normalizeAccuracy(point.accuracy) < 0.82 || Math.abs(point.lagSec) > 2);
  if (!firstStruggle) return null;
  const recovered = timeline.find((point) => point.timestampMs > firstStruggle.timestampMs && normalizeAccuracy(point.accuracy) >= 0.86 && Math.abs(point.lagSec) <= 1.5);
  return recovered ? recovered.timestampMs - firstStruggle.timestampMs : null;
}

export function computeErrorBurstLength(timeline: AdaptiveTimelinePoint[]): number {
  let current = 0;
  let max = 0;
  for (const point of timeline) {
    if (normalizeAccuracy(point.accuracy) < 0.82 || Math.abs(point.lagSec) > 2) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

export function computeModeSwitchFrequency(timeline: AdaptiveTimelinePoint[]): number {
  if (timeline.length < 2) return 0;
  let switches = 0;
  for (let i = 1; i < timeline.length; i += 1) {
    if (timeline[i].mode !== timeline[i - 1].mode) switches += 1;
  }
  return switches / (timeline.length - 1);
}
