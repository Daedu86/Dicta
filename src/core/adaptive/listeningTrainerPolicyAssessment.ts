import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
} from './types';
import {
  BOUNDARY_SUPPORT_WEAK_AREAS,
  CHALLENGE_BLOCKING_WEAK_AREAS,
  RECOVERY_WEAK_AREAS,
  assessFeedbackPressure,
  assessListeningPrecisionPressure,
  clamp01,
  finiteOr,
  hasAny,
} from './listeningTrainerPolicySignals';

export function assessListeningTrainingPolicy(args: {
  profile: InputLanguageBenchmarkMetrics;
  latestFeedback?: AdaptiveSessionFeedback | null;
}) {
  const { profile, latestFeedback = null } = args;
  const profileKey = `${profile.inputMode}/${profile.language}`;
  const confidence = clamp01(profile.recommendation?.confidence ?? 0);
  const sampleCount = finiteOr(profile.sampleCount, 0);
  const averageAccuracy = finiteOr(profile.averageAccuracy, 0);
  const hasAccuracySignal = sampleCount > 0 && averageAccuracy > 0;
  const averageLagSec = Math.abs(finiteOr(profile.stableAverageLagSec || profile.averageLagSec, profile.averageLagSec));
  const p75LagSec = Math.abs(finiteOr(profile.p75LagSec, 0));
  const p90AbsLagSec = Math.abs(finiteOr(profile.p90AbsLagSec, averageLagSec));
  const flowStabilityScore = clamp01(profile.flowStabilityScore);
  const learningEffectivenessScore = clamp01(profile.learningEffectivenessScore);
  const weakAreas = new Set(profile.weakAreas);
  const hasRecoveryWeakArea = hasAny(weakAreas, RECOVERY_WEAK_AREAS);
  const hasChallengeBlocker = hasAny(weakAreas, CHALLENGE_BLOCKING_WEAK_AREAS);
  const hasBoundarySupportInstability = hasAny(weakAreas, BOUNDARY_SUPPORT_WEAK_AREAS);
  const feedbackPressure = assessFeedbackPressure(latestFeedback);
  const precisionPressure = assessListeningPrecisionPressure(profile, latestFeedback);

  const lowConfidence = confidence < 0.45 || sampleCount < 8;
  const lowAccuracy = hasAccuracySignal && averageAccuracy < 0.8;
  const veryLowAccuracy = hasAccuracySignal && averageAccuracy < 0.76;
  const highLag = averageLagSec > 2.4 || p75LagSec > 2.6 || p90AbsLagSec > 3.2;
  const poorFlow = flowStabilityScore < 0.55;
  const strongBoundaryInstability = hasBoundarySupportInstability && (confidence < 0.65 || flowStabilityScore < 0.7);

  const recoveryRecommended =
    lowConfidence ||
    lowAccuracy ||
    highLag ||
    poorFlow ||
    strongBoundaryInstability ||
    feedbackPressure.isRecoveryPressure ||
    precisionPressure.isRecoveryPressure ||
    (hasRecoveryWeakArea && confidence < 0.55);

  const stableEnough =
    confidence >= 0.55 &&
    sampleCount >= 8 &&
    (!hasAccuracySignal || averageAccuracy >= 0.8) &&
    averageLagSec <= 2.2 &&
    p90AbsLagSec <= 3 &&
    flowStabilityScore >= 0.6 &&
    !strongBoundaryInstability &&
    !feedbackPressure.isRecoveryPressure &&
    !precisionPressure.isRecoveryPressure &&
    !precisionPressure.isStabilizationPressure;

  const challengeSafe =
    confidence >= 0.68 &&
    sampleCount >= 20 &&
    (!hasAccuracySignal || averageAccuracy >= 0.84) &&
    averageLagSec <= 1.6 &&
    p90AbsLagSec <= 2.3 &&
    flowStabilityScore >= 0.72 &&
    learningEffectivenessScore >= 0.35 &&
    !hasChallengeBlocker &&
    !feedbackPressure.isAnyPressure &&
    !precisionPressure.isAnyPressure;

  return {
    profileKey,
    confidence,
    averageAccuracy,
    hasAccuracySignal,
    averageLagSec,
    flowStabilityScore,
    weakAreas,
    hasBoundarySupportInstability,
    feedbackPressure,
    precisionPressure,
    veryLowAccuracy,
    highLag,
    poorFlow,
    recoveryRecommended,
    stableEnough,
    challengeSafe,
  };
}
