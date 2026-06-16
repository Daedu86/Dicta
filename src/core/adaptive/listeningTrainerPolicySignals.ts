import type {
  AdaptiveSessionFeedback,
  AdaptiveWeakArea,
  InputLanguageBenchmarkMetrics,
  ListeningPrecisionMetrics,
} from './types';

export const RECOVERY_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'lag',
  'lag_instability',
  'low_accuracy',
  'accuracy_instability',
  'flow_instability',
  'support_dependency',
  'unsafe_boundary_pressure',
]);

export const CHALLENGE_BLOCKING_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'low_accuracy',
  'accuracy_instability',
  'lag',
  'lag_instability',
  'flow_instability',
  'support_dependency',
  'unsafe_boundaries',
  'unsafe_boundary_pressure',
  'low_semantic_completeness',
  'replay',
]);

export const BOUNDARY_SUPPORT_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'unsafe_boundaries',
  'unsafe_boundary_pressure',
  'low_semantic_completeness',
  'support_dependency',
  'replay',
]);

export type FeedbackPressure = {
  isAnyPressure: boolean;
  isRecoveryPressure: boolean;
  reasons: string[];
};

export type ListeningPrecisionPressure = {
  isAnyPressure: boolean;
  isRecoveryPressure: boolean;
  isStabilizationPressure: boolean;
  requiresStrictBoundary: boolean;
  score: number;
  reasons: string[];
};

export function assessFeedbackPressure(feedback: AdaptiveSessionFeedback | null): FeedbackPressure {
  if (!feedback) return { isAnyPressure: false, isRecoveryPressure: false, reasons: [] };
  const reasons: string[] = [];
  const issues = feedback.playbackIssues;
  if (feedback.verdict === 'regressed') reasons.push('latest session regressed');
  if (issues.repeatedPhraseCount >= 3 || issues.maxRepeatCountForSinglePhrase >= 3) reasons.push('repeat pressure');
  if (issues.skippedPhraseCount > 0) reasons.push('skipped phrases');
  if (issues.outOfOrderAdvanceCount > 0 || issues.replayAdvancedPhraseCount > 0 || issues.phraseIndexJumpCount > 0) {
    reasons.push('phrase order instability');
  }
  if (feedback.phraseStats.totalPhrases > 0) {
    const completionRatio = feedback.phraseStats.completedPhrases / feedback.phraseStats.totalPhrases;
    if (completionRatio < 0.75) reasons.push('low phrase completion');
  }
  const isRecoveryPressure = reasons.some((reason) =>
    reason === 'latest session regressed' ||
    reason === 'phrase order instability' ||
    reason === 'low phrase completion'
  );
  return {
    isAnyPressure: reasons.length > 0,
    isRecoveryPressure,
    reasons,
  };
}

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

export function hasAny(values: Set<AdaptiveWeakArea>, targets: Set<AdaptiveWeakArea>): boolean {
  for (const value of values) {
    if (targets.has(value)) return true;
  }
  return false;
}

export function finiteOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function finitePositiveOr(value: number | null | undefined, fallback: number): number {
  const next = finiteOr(value, fallback);
  return next > 0 ? next : fallback;
}

export function clamp01(value: number): number {
  return clamp(finiteOr(value, 0), 0, 1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round2(value: number): number {
  return Number(value.toFixed(2));
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
