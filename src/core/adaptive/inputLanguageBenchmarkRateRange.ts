import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';
import type { InputLanguageBenchmarkMetrics, RateAccuracyBucket } from './types';
import { clamp01, normalizeAccuracy } from './inputLanguageBenchmarkMath';

export function pickBestRateRange(rateAccuracyBuckets: RateAccuracyBucket[]): [number, number] {
  if (rateAccuracyBuckets.length === 0) return [0.6, 1.15];
  const scored = [...rateAccuracyBuckets].sort((a, b) => rateBucketScore(b) - rateBucketScore(a));
  const best = scored[0];
  const nearby = scored.filter((bucket) => Math.abs(bucket.rate - best.rate) <= 0.05 && rateBucketScore(bucket) >= rateBucketScore(best) * 0.85);
  const rates = nearby.length > 0 ? nearby.map((bucket) => bucket.rate) : [best.rate];
  const lower = Math.min(...rates);
  const upper = Math.max(...rates);
  return [Math.max(0.6, lower - 0.04), Math.min(1.15, upper + 0.04)];
}

export function calibrateTargetRateRangeForProfile(
  metrics: InputLanguageBenchmarkMetrics,
  base: [number, number],
): [number, number] {
  const inputMode = String(metrics.inputMode).toLowerCase();
  if (inputMode !== 'browser-tts') {
    return base;
  }
  const profile = resolveBrowserTtsAdaptiveProfile(String(metrics.language).toLowerCase());
  if (!profile.recommendationCalibrationEnabled) {
    return base;
  }
  const gate = profile.recommendationCalibrationGate;
  if (!gate) return base;
  const [lower, upper] = base;
  const highAccuracy = normalizeAccuracy(metrics.averageAccuracy) >= gate.minAccuracy;
  const stableLagNearZero = Math.abs(metrics.stableAverageLagSec) <= gate.maxStableLagSecAbs && metrics.p90AbsLagSec <= gate.maxP90AbsLagSec;
  if (!highAccuracy || !stableLagNearZero || lower >= profile.minRecommendedRate) {
    return base;
  }
  const adjustedLower = profile.minRecommendedRate;
  const adjustedUpper = Math.max(upper, adjustedLower + 0.04);
  return [adjustedLower, adjustedUpper];
}

function rateBucketScore(bucket: RateAccuracyBucket): number {
  const accuracy = normalizeAccuracy(bucket.averageAccuracy);
  const lagScore = clamp01(1 - Math.abs(bucket.averageLagSec) / 4);
  const sampleScore = clamp01(bucket.sampleCount / 8);
  return accuracy * 0.6 + lagScore * 0.3 + sampleScore * 0.1;
}
