import type { InputLanguageBenchmarkMetrics } from './types';
import { clamp01 } from './inputLanguageBenchmarkMath';

export function computeSweetSpotScore(metrics: InputLanguageBenchmarkMetrics): number {
  return clamp01(
    metrics.semanticFidelityScore * 0.3 +
      metrics.controlFidelityScore * 0.25 +
      metrics.learningEffectivenessScore * 0.3 +
      metrics.flowStabilityScore * 0.15,
  );
}

export function computeSemanticFidelityScore(metrics: InputLanguageBenchmarkMetrics): number {
  const unsafeRate = metrics.unsafePauseCount / Math.max(1, metrics.sampleCount);
  const deferredRate = metrics.deferredPauseCount / Math.max(1, metrics.sampleCount);
  const cutPenalty = metrics.semanticCutPenalty / Math.max(1, metrics.sampleCount);
  return clamp01(metrics.averageSemanticCompleteness * 0.55 + (1 - cutPenalty) * 0.2 + (1 - unsafeRate) * 0.2 + (1 - deferredRate) * 0.05);
}

export function computeControlFidelityScore(metrics: InputLanguageBenchmarkMetrics): number {
  const replayPenalty = metrics.replayDeniedByBoundaryCount / Math.max(1, metrics.sampleCount);
  return clamp01(metrics.inputExecutionFidelityScore * 0.75 + (1 - replayPenalty) * 0.25);
}

export function computeLearningEffectivenessScore(metrics: InputLanguageBenchmarkMetrics): number {
  const accuracy = clamp01(metrics.averageAccuracy > 1 ? metrics.averageAccuracy / 100 : metrics.averageAccuracy);
  const lagScore = clamp01(1 - Math.abs(metrics.stableAverageLagSec) / 5);
  const lagConsistencyScore = clamp01(1 - metrics.p90AbsLagSec / 5);
  const outlierPenalty = clamp01(1 - metrics.lagOutlierCount / Math.max(1, metrics.sampleCount * 0.2));
  const correctionScore = clamp01(1 - metrics.averageCorrectionRate / 0.25);
  const burstScore = clamp01(1 - metrics.errorBurstLength / 12);
  return clamp01(accuracy * 0.4 + lagScore * 0.2 + lagConsistencyScore * 0.15 + correctionScore * 0.15 + burstScore * 0.05 + outlierPenalty * 0.05);
}

export function computeFlowStabilityScore(metrics: InputLanguageBenchmarkMetrics): number {
  const modeScore = clamp01(1 - metrics.modeSwitchFrequency / 0.35);
  const rateScore = clamp01(1 - metrics.rateVariance / 0.04);
  const pauseScore = clamp01(1 - metrics.pauseVariance / 250000);
  const replayScore = clamp01(1 - metrics.replayDeniedByBoundaryCount / Math.max(1, metrics.sampleCount));
  return clamp01(modeScore * 0.35 + rateScore * 0.25 + pauseScore * 0.2 + replayScore * 0.2);
}
