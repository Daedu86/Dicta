import type { InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';

export type TargetZone = { lagMin: number; lagMax: number; accuracyMin: number; accuracyMax: number };

export type TargetZonePoint = {
  i: number;
  lag: number;
  accuracy: number;
  mode: string;
  rate: number;
  event: string;
};

export type MiniTrendPoint = {
  i: number;
  rate: number;
  lag: number;
  accuracy: number;
};

export type RateAccuracyBucketPoint = {
  rate: string;
  accuracy: number;
  lag: number;
  samples: number;
};

export type LagDistributionBucket = {
  label: string;
  count: number;
};

export const ADAPTIVE_CHART_TOOLTIP_STYLE = {
  borderRadius: 10,
  borderColor: 'rgba(148, 163, 184, 0.38)',
  background: 'rgba(2, 6, 23, 0.92)',
  color: 'rgba(226, 232, 240, 0.92)',
} as const;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function toPercent(value: number): number {
  return Math.round(clamp01(value) * 1000) / 10;
}

export function defaultTargetZone(): TargetZone {
  // A pragmatic default: target high accuracy + near-zero lag. Tune later per input if needed.
  const accuracyMin = 0.9;
  const accuracyMax = 1;
  const lagMin = -0.6;
  const lagMax = 0.6;
  return { lagMin, lagMax, accuracyMin, accuracyMax };
}

export function buildTargetZoneData(profile: InputLanguageBenchmarkMetrics, points: number): TargetZonePoint[] {
  return profile.timeline.slice(-points).map((point, index) => ({
    i: index,
    lag: Number(point.lagSec.toFixed(3)),
    accuracy: clamp01(point.accuracy),
    mode: point.mode,
    rate: point.playbackRate,
    event: point.event ?? 'rate_change',
  }));
}

export function getTargetZoneLagDomain(data: TargetZonePoint[], zone: TargetZone): [number, number] {
  const lagValues = data.map((d) => d.lag);
  return [Math.min(zone.lagMin - 0.5, ...lagValues, -2.5), Math.max(zone.lagMax + 0.5, ...lagValues, 2.5)];
}

export function buildMiniTrendData(profile: InputLanguageBenchmarkMetrics, points: number): MiniTrendPoint[] {
  return profile.timeline.slice(-points).map((point, index) => ({
    i: index + 1,
    rate: point.playbackRate,
    lag: point.lagSec,
    accuracy: clamp01(point.accuracy) * 100,
  }));
}

export function buildRateAccuracyData(profile: InputLanguageBenchmarkMetrics): RateAccuracyBucketPoint[] {
  return profile.rateAccuracyBuckets.map((bucket) => ({
    rate: `${bucket.rate.toFixed(2)}x`,
    accuracy: toPercent(bucket.averageAccuracy),
    lag: Number(bucket.averageLagSec.toFixed(2)),
    samples: bucket.sampleCount,
  }));
}

export function buildLagDistributionData(profile: InputLanguageBenchmarkMetrics): LagDistributionBucket[] {
  const buckets = new Map<string, LagDistributionBucket>();
  const labels = ['<-2s', '-2..-1s', '-1..0s', '0..1s', '1..2s', '>2s'];
  for (const label of labels) buckets.set(label, { label, count: 0 });
  for (const point of profile.timeline.slice(-120)) {
    const lag = point.stableLagSec ?? point.lagSec;
    const label = lag < -2 ? '<-2s' : lag < -1 ? '-2..-1s' : lag < 0 ? '-1..0s' : lag <= 1 ? '0..1s' : lag <= 2 ? '1..2s' : '>2s';
    const bucket = buckets.get(label);
    if (bucket) bucket.count += 1;
  }
  return [...buckets.values()];
}
