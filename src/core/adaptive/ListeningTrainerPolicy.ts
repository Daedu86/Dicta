import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  ListeningTrainingIntent,
  ListeningTrainingPrescription,
} from './types';
import {
  BOUNDARY_SUPPORT_WEAK_AREAS,
  CHALLENGE_BLOCKING_WEAK_AREAS,
  RECOVERY_WEAK_AREAS,
  assessFeedbackPressure,
  assessListeningPrecisionPressure,
  clamp01,
  finiteOr,
  finitePositiveOr,
  hasAny,
} from './listeningTrainerPolicySignals';
import {
  adjustPauseForMode,
  adjustPauseForPrecision,
  adjustPhraseSizeForMode,
  adjustPhraseSizeForPrecision,
  adjustRateRangeForMode,
  adjustRateRangeForPrecision,
  defaultDurationForMode,
  phraseDifficultyRangeForDifficulty,
  phrasePolicyForMode,
  resolveDifficulty,
  resolveTrainingMode,
  sanitizeRateRange,
  targetAccuracyBandForMode,
  targetLagMaxSecForMode,
} from './listeningTrainerPolicyPacing';
import {
  buildContentGuidance,
  buildPacingGuidance,
  buildRationale,
} from './listeningTrainerPolicyGuidance';

export function buildListeningTrainingPrescription(args: {
  profile: InputLanguageBenchmarkMetrics;
  latestFeedback?: AdaptiveSessionFeedback | null;
  userIntent?: ListeningTrainingIntent;
  durationMinutes?: 1 | 2 | 3 | 4;
  targetDifficulty?: DictationScriptDifficulty;
}): ListeningTrainingPrescription {
  const { profile, latestFeedback = null, targetDifficulty } = args;
  const userIntent = args.userIntent ?? 'auto';
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

  const mode = resolveTrainingMode({
    userIntent,
    recoveryRecommended,
    stableEnough,
    challengeSafe,
    severeRecovery: veryLowAccuracy || highLag || poorFlow || feedbackPressure.isRecoveryPressure || precisionPressure.isRecoveryPressure,
  });
  const difficulty = resolveDifficulty({ mode, targetDifficulty, challengeSafe, recoveryRecommended });
  const baseRateRange = sanitizeRateRange(profile.recommendation?.targetRateRange, profile.preferredPlaybackRate);
  const basePauseMs = finitePositiveOr(profile.recommendation?.targetPauseMs, profile.preferredPauseAfterPhraseMs || 700);
  const basePhraseSize = profile.recommendation?.targetPhraseSize ?? profile.preferredPhraseSize ?? 'medium';
  const targetRateRange = adjustRateRangeForPrecision(adjustRateRangeForMode(baseRateRange, mode), precisionPressure);
  const targetPauseMs = adjustPauseForPrecision(adjustPauseForMode(basePauseMs, mode), precisionPressure);
  const targetPhraseSize = adjustPhraseSizeForPrecision(
    adjustPhraseSizeForMode(basePhraseSize, mode, hasBoundarySupportInstability),
    precisionPressure,
  );
  const phraseDifficultyRange = phraseDifficultyRangeForDifficulty(difficulty);
  const boundaryPolicy = mode === 'recover' || hasBoundarySupportInstability || precisionPressure.requiresStrictBoundary
    ? 'strict_semantic'
    : 'normal_semantic';

  return {
    goal: 'listening_comprehension',
    profileKey,
    inputMode: profile.inputMode,
    language: profile.language,
    mode,
    userIntent,
    difficulty,
    durationMinutes: args.durationMinutes ?? defaultDurationForMode(mode),
    targetAccuracyBand: targetAccuracyBandForMode(mode),
    targetLagMaxSec: targetLagMaxSecForMode(mode),
    targetRateRange,
    targetPauseMs,
    targetPhraseSize,
    phraseDifficultyRange,
    phrasePolicy: phrasePolicyForMode(mode),
    boundaryPolicy,
    contentGuidance: buildContentGuidance(weakAreas, mode, precisionPressure),
    pacingGuidance: buildPacingGuidance({
      mode,
      targetRateRange,
      targetPauseMs,
      targetPhraseSize,
      phraseDifficultyRange,
      boundaryPolicy,
      precisionPressure,
    }),
    rationale: buildRationale({
      profileKey,
      userIntent,
      mode,
      targetDifficulty,
      difficulty,
      confidence,
      averageAccuracy,
      hasAccuracySignal,
      averageLagSec,
      flowStabilityScore,
      weakAreas,
      feedbackPressure,
      precisionPressure,
      challengeSafe,
      recoveryRecommended,
    }),
  };
}
