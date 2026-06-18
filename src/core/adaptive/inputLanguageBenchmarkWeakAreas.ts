import type { AdaptiveWeakArea, InputLanguageBenchmarkMetrics } from './types';

const SENSITIVE_BENCHMARK_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'lag',
  'low_accuracy',
  'unsafe_boundary_pressure',
  'flow_instability',
  'support_dependency',
]);

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
  return [...new Set(weakAreas)];
}

export function hasSensitiveBenchmarkWeakAreas(weakAreas: AdaptiveWeakArea[]): boolean {
  return weakAreas.some((weakArea) => SENSITIVE_BENCHMARK_WEAK_AREAS.has(weakArea));
}
