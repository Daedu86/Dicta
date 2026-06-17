import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  ListeningPrecisionMetrics,
} from './types';
import { clamp01 } from './listeningTrainerPolicyMath';

export {
  BOUNDARY_SUPPORT_WEAK_AREAS,
  CHALLENGE_BLOCKING_WEAK_AREAS,
  RECOVERY_WEAK_AREAS,
  hasAny,
} from './listeningTrainerWeakAreaSets';
export {
  assessFeedbackPressure,
} from './listeningTrainerFeedbackPressure';
export type {
  FeedbackPressure,
} from './listeningTrainerFeedbackPressure';
export {
  clamp,
  clamp01,
  finiteOr,
  finitePositiveOr,
  round2,
} from './listeningTrainerPolicyMath';

export type ListeningPrecisionPressure = {
  isAnyPressure: boolean;
  isRecoveryPressure: boolean;
  isStabilizationPressure: boolean;
  requiresStrictBoundary: boolean;
  score: number;
  reasons: string[];
};

export function assessListeningPrecisionPressure(
  profile: InputLanguageBenchmarkMetrics,
  latestFeedback: AdaptiveSessionFeedback | null,
): ListeningPrecisionPressure {
  const metrics = latestFeedback?.listeningPrecisionSummary ?? profile.listeningPrecisionAverages;
  if (!metrics) {
    return {
      isAnyPressure: false,
      isRecoveryPressure: false,
      isStabilizationPressure: false,
      requiresStrictBoundary: false,
      score: 1,
      reasons: [],
    };
  }

  const score = computeListeningPrecisionPolicyScore(metrics);
  const reasons: string[] = [];
  const recoveryReasons: string[] = [];
  const stabilizationReasons: string[] = [];

  if (score < 0.78) recoveryReasons.push(`low listening precision score ${score.toFixed(2)}`);
  if (metrics.contentWordRecall < 0.75) recoveryReasons.push(`content word recall ${metrics.contentWordRecall.toFixed(2)}`);
  if (metrics.omissionRate > 0.18) recoveryReasons.push(`omission rate ${metrics.omissionRate.toFixed(2)}`);
  if (metrics.completionWindowScore < 0.65) recoveryReasons.push(`completion window score ${metrics.completionWindowScore.toFixed(2)}`);

  if (score < 0.86) stabilizationReasons.push(`listening precision score ${score.toFixed(2)}`);
  if (metrics.detailPrecisionScore < 0.78) stabilizationReasons.push(`detail precision ${metrics.detailPrecisionScore.toFixed(2)}`);
  if (metrics.functionWordAccuracy < 0.78) stabilizationReasons.push(`function-word accuracy ${metrics.functionWordAccuracy.toFixed(2)}`);
  if (metrics.wordOrderAccuracy < 0.8) stabilizationReasons.push(`word order ${metrics.wordOrderAccuracy.toFixed(2)}`);
  if (metrics.completionWindowScore < 0.8) stabilizationReasons.push(`completion window score ${metrics.completionWindowScore.toFixed(2)}`);

  if (score < 0.92) reasons.push(`emerging listening precision score ${score.toFixed(2)}`);
  if (metrics.omissionRate > 0.08) reasons.push(`emerging omission rate ${metrics.omissionRate.toFixed(2)}`);
  if (metrics.completionWindowScore < 0.9) reasons.push(`emerging completion window score ${metrics.completionWindowScore.toFixed(2)}`);

  const mergedReasons = [...new Set([...recoveryReasons, ...stabilizationReasons, ...reasons])];
  const isRecoveryPressure = recoveryReasons.length > 0;
  const isStabilizationPressure = isRecoveryPressure || stabilizationReasons.length > 0;

  return {
    isAnyPressure: mergedReasons.length > 0,
    isRecoveryPressure,
    isStabilizationPressure,
    requiresStrictBoundary: metrics.wordOrderAccuracy < 0.8 || metrics.completionWindowScore < 0.8,
    score,
    reasons: mergedReasons,
  };
}

function computeListeningPrecisionPolicyScore(metrics: ListeningPrecisionMetrics): number {
  return clamp01(
    metrics.listeningRecallScore * 0.28 +
    metrics.contentWordRecall * 0.23 +
    metrics.detailPrecisionScore * 0.14 +
    metrics.functionWordAccuracy * 0.14 +
    metrics.wordOrderAccuracy * 0.09 +
    metrics.completionWindowScore * 0.12,
  );
}
