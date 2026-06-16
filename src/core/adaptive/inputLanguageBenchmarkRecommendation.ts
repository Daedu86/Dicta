import type {
  AdaptiveWeakArea,
  InputLanguageBenchmarkMetrics,
  InputLanguageBenchmarkRecommendation,
  RateAccuracyBucket,
} from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  analyzeBrowserTtsDeTimelinePressure,
  applyBrowserTtsDeTimelinePressureFallback,
  deriveBrowserTtsDeTimelineWeakAreas,
  isBrowserTtsDe,
} from './browserTtsDeBenchmarkPolicy';
import {
  clamp01,
  normalizeAccuracy,
} from './inputLanguageBenchmarkMath';

export function normalizeInputLanguageBenchmarkForRecommendation(
  metrics: InputLanguageBenchmarkMetrics,
): InputLanguageBenchmarkMetrics {
  return applyBrowserTtsDeTimelinePressureFallback(metrics);
}

export function computeBenchmarkRecommendation(metrics: InputLanguageBenchmarkMetrics): InputLanguageBenchmarkRecommendation {
  const targetRateRange = calibrateTargetRateRangeForProfile(metrics, pickBestRateRange(metrics.rateAccuracyBuckets));
  const weakAreas = deriveWeakAreas(metrics);
  const targetPhraseSize = metrics.averagePhraseDifficulty > 0.65 || metrics.averageSemanticCompleteness < 0.7 ? 'short' : metrics.preferredPhraseSize;
  const focus = weakAreas.length > 0 ? weakAreas.slice(0, 3).map(formatWeakArea) : [`Maintain stable pace and ${targetPhraseSize}-length semantic phrases`];
  const confidence = clamp01(Math.min(1, metrics.sampleCount / 40) * metrics.sweetSpotScore);
  const inputLabel = metrics.inputMode;
  const languageLabel = String(metrics.language).toUpperCase();
  return {
    targetRateRange,
    targetPhraseSize,
    targetPauseMs: Math.round(metrics.preferredPauseAfterPhraseMs || 700),
    nextTrainingFocus: focus,
    confidence,
    summary:
      metrics.sampleCount === 0
        ? `No benchmark samples yet for ${inputLabel} ${languageLabel}.`
        : `For ${inputLabel} ${languageLabel}, the current target is ${targetRateRange[0].toFixed(2)}x-${targetRateRange[1].toFixed(2)}x with focus on ${focus.join(', ')}.`,
  };
}

export function pickBestRateRange(rateAccuracyBuckets: RateAccuracyBucket[]): [number, number] {
  if (rateAccuracyBuckets.length === 0) return [0.9, 1];
  const scored = [...rateAccuracyBuckets].sort((a, b) => rateBucketScore(b) - rateBucketScore(a));
  const best = scored[0];
  const nearby = scored.filter((bucket) => Math.abs(bucket.rate - best.rate) <= 0.05 && rateBucketScore(bucket) >= rateBucketScore(best) * 0.85);
  const rates = nearby.length > 0 ? nearby.map((bucket) => bucket.rate) : [best.rate];
  return [Math.min(...rates), Math.max(...rates)];
}

export function deriveWeakAreas(metrics: InputLanguageBenchmarkMetrics): AdaptiveWeakArea[] {
  const weakAreas: AdaptiveWeakArea[] = [];
  if (metrics.averagePhraseDifficulty > 0.65) weakAreas.push('long_phrases');
  if (metrics.averageSemanticCompleteness < 0.7) weakAreas.push('low_semantic_completeness');
  if (metrics.unsafePauseCount > Math.max(2, metrics.sampleCount * 0.08)) weakAreas.push('unsafe_boundaries');
  if (metrics.replayDeniedByBoundaryCount > Math.max(2, metrics.sampleCount * 0.08)) weakAreas.push('replay');
  if (Math.abs(metrics.stableAverageLagSec) > 2 || metrics.p90AbsLagSec > 3) weakAreas.push('lag');
  if (metrics.averageCorrectionRate > 0.12) weakAreas.push('corrections');
  if (metrics.averageAccuracy < 0.82) weakAreas.push('low_accuracy');
  if (metrics.modeSwitchFrequency > 0.25 || metrics.rateVariance > 0.03) weakAreas.push('flow_instability');
  if (metrics.rateAccuracyBuckets.some((bucket) => bucket.rate >= 1.05 && bucket.averageAccuracy < 0.82)) weakAreas.push('high_rate');
  if (isBrowserTtsDe(metrics.inputMode, metrics.language)) {
    weakAreas.push(...deriveBrowserTtsDeTimelineWeakAreas(analyzeBrowserTtsDeTimelinePressure(metrics)));
  }
  return [...new Set(weakAreas)];
}

function rateBucketScore(bucket: RateAccuracyBucket): number {
  const accuracy = normalizeAccuracy(bucket.averageAccuracy);
  const lagScore = clamp01(1 - Math.abs(bucket.averageLagSec) / 4);
  const sampleScore = clamp01(bucket.sampleCount / 8);
  return accuracy * 0.6 + lagScore * 0.3 + sampleScore * 0.1;
}

function formatWeakArea(value: AdaptiveWeakArea): string {
  return value.replace(/_/g, ' ');
}

function calibrateTargetRateRangeForProfile(
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
