import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  ListeningTrainingIntent,
  ListeningTrainingPrescription,
} from './types';
import {
  defaultDurationForMode,
  resolveDifficulty,
  resolveTrainingMode,
  targetAccuracyBandForMode,
  targetLagMaxSecForMode,
} from './listeningTrainerPolicyPacing';
import {
  buildPacingGuidance,
  buildRationale,
} from './listeningTrainerPolicyGuidance';
import { assessListeningTrainingPolicy } from './listeningTrainerPolicyAssessment';
import { buildListeningTrainingLearningPolicy } from './listeningTrainerPolicyLearningTargets';
import { buildListeningTrainingRuntimePolicy } from './listeningTrainerPolicyRuntimeTargets';

export function buildListeningTrainingPrescription(args: {
  profile: InputLanguageBenchmarkMetrics;
  latestFeedback?: AdaptiveSessionFeedback | null;
  userIntent?: ListeningTrainingIntent;
  durationMinutes?: 1 | 2 | 3 | 4 | 5;
  targetDifficulty?: DictationScriptDifficulty;
}): ListeningTrainingPrescription {
  const { profile, targetDifficulty } = args;
  const userIntent = args.userIntent ?? 'auto';
  const assessment = assessListeningTrainingPolicy({
    profile,
    latestFeedback: args.latestFeedback ?? null,
  });

  const mode = resolveTrainingMode({
    userIntent,
    recoveryRecommended: assessment.recoveryRecommended,
    stableEnough: assessment.stableEnough,
    challengeSafe: assessment.challengeSafe,
    severeRecovery:
      assessment.veryLowAccuracy ||
      assessment.highLag ||
      assessment.poorFlow ||
      assessment.feedbackPressure.isRecoveryPressure ||
      assessment.precisionPressure.isRecoveryPressure,
  });
  const difficulty = resolveDifficulty({
    mode,
    targetDifficulty,
    challengeSafe: assessment.challengeSafe,
    recoveryRecommended: assessment.recoveryRecommended,
  });
  const runtimePolicy = buildListeningTrainingRuntimePolicy({
    profile,
    mode,
    hasBoundarySupportInstability: assessment.hasBoundarySupportInstability,
    precisionPressure: assessment.precisionPressure,
  });
  const learningPolicy = buildListeningTrainingLearningPolicy({
    mode,
    difficulty,
    weakAreas: assessment.weakAreas,
    precisionPressure: assessment.precisionPressure,
  });

  return {
    goal: 'listening_comprehension',
    profileKey: assessment.profileKey,
    inputMode: profile.inputMode,
    language: profile.language,
    mode,
    userIntent,
    difficulty,
    durationMinutes: args.durationMinutes ?? defaultDurationForMode(mode),
    targetAccuracyBand: targetAccuracyBandForMode(mode),
    targetLagMaxSec: targetLagMaxSecForMode(mode),
    targetRateRange: runtimePolicy.targetRateRange,
    targetPauseMs: runtimePolicy.targetPauseMs,
    targetPhraseSize: runtimePolicy.targetPhraseSize,
    phraseDifficultyRange: learningPolicy.phraseDifficultyRange,
    phrasePolicy: learningPolicy.phrasePolicy,
    boundaryPolicy: runtimePolicy.boundaryPolicy,
    contentGuidance: learningPolicy.contentGuidance,
    runtimePolicy,
    learningPolicy,
    pacingGuidance: buildPacingGuidance({
      mode,
      targetRateRange: runtimePolicy.targetRateRange,
      targetPauseMs: runtimePolicy.targetPauseMs,
      targetPhraseSize: runtimePolicy.targetPhraseSize,
      phraseDifficultyRange: learningPolicy.phraseDifficultyRange,
      boundaryPolicy: runtimePolicy.boundaryPolicy,
      precisionPressure: assessment.precisionPressure,
    }),
    rationale: buildRationale({
      profileKey: assessment.profileKey,
      userIntent,
      mode,
      targetDifficulty,
      difficulty,
      confidence: assessment.confidence,
      averageAccuracy: assessment.averageAccuracy,
      hasAccuracySignal: assessment.hasAccuracySignal,
      averageLagSec: assessment.averageLagSec,
      flowStabilityScore: assessment.flowStabilityScore,
      weakAreas: assessment.weakAreas,
      feedbackPressure: assessment.feedbackPressure,
      precisionPressure: assessment.precisionPressure,
      challengeSafe: assessment.challengeSafe,
      recoveryRecommended: assessment.recoveryRecommended,
    }),
  };
}
