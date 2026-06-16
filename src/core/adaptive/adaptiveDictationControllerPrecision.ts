import type { ListeningPrecisionMetrics, PacingMode } from './types';
import { clamp } from './adaptiveDictationControllerMath';

export function computeListeningPrecisionControlScore(metrics: ListeningPrecisionMetrics): number {
  return clamp(
    metrics.listeningRecallScore * 0.28 +
      metrics.contentWordRecall * 0.23 +
      metrics.detailPrecisionScore * 0.14 +
      metrics.functionWordAccuracy * 0.14 +
      metrics.wordOrderAccuracy * 0.09 +
      metrics.completionWindowScore * 0.12,
    0,
    1,
  );
}

export function resolveListeningPrecisionRateCeiling(
  metrics: ListeningPrecisionMetrics | undefined,
  mode: PacingMode,
  supportRateCeiling: number,
): number | null {
  if (!metrics) return null;
  const precisionScore = computeListeningPrecisionControlScore(metrics);
  const severePrecisionRisk =
    precisionScore < 0.78 ||
    metrics.contentWordRecall < 0.75 ||
    metrics.omissionRate > 0.18 ||
    metrics.completionWindowScore < 0.65;
  if (severePrecisionRisk) return mode === 'support' || mode === 'recovery' ? supportRateCeiling : 0.92;

  const unstablePrecisionRisk =
    precisionScore < 0.86 ||
    metrics.detailPrecisionScore < 0.78 ||
    metrics.functionWordAccuracy < 0.78 ||
    metrics.wordOrderAccuracy < 0.8 ||
    metrics.completionWindowScore < 0.8;
  if (unstablePrecisionRisk) return mode === 'flow' ? 0.98 : 0.96;

  const emergingPrecisionRisk =
    precisionScore < 0.92 ||
    metrics.omissionRate > 0.08 ||
    metrics.completionWindowScore < 0.9;
  if (emergingPrecisionRisk) return mode === 'flow' ? 1.02 : 1;

  return null;
}
