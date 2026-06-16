import type { InputLanguageBenchmarkMetrics } from './types';
import type { AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';

export function buildExecutiveSummary({
  profile,
  sessionSummary,
  positiveSignals,
  needsImprovement,
  recommendedNextExercise,
}: {
  profile: InputLanguageBenchmarkMetrics;
  sessionSummary: AdaptiveUserSystemReport['userProgressSummary']['latestSession'];
  positiveSignals: string[];
  needsImprovement: string[];
  recommendedNextExercise: AdaptiveUserSystemReport['userProgressSummary']['recommendedNextExercise'];
}): AdaptiveUserSystemReport['executiveSummary'] {
  const confidence = profile.recommendation.confidence;
  const latestAccuracy = sessionSummary ? Number.parseFloat(sessionSummary.accuracy) : null;
  const needsRecovery =
    confidence < 0.3 ||
    profile.weakAreas.includes('low_accuracy') ||
    profile.weakAreas.includes('lag') ||
    profile.weakAreas.includes('unsafe_boundary_pressure') ||
    profile.weakAreas.includes('unsafe_boundaries');
  const challengeReady =
    recommendedNextExercise.difficulty === 'hard' &&
    confidence >= 0.6 &&
    (latestAccuracy === null || latestAccuracy >= 90) &&
    !profile.weakAreas.includes('lag') &&
    !profile.weakAreas.includes('low_accuracy');
  const status: AdaptiveUserSystemReport['executiveSummary']['status'] = !sessionSummary
    ? 'needs_more_data'
    : needsRecovery
      ? 'recovery_recommended'
      : challengeReady
        ? 'challenge_ready'
        : 'stable';

  const headline =
    status === 'needs_more_data'
      ? `Collect more completed sessions for ${profile.inputMode}/${profile.language}.`
      : status === 'recovery_recommended'
        ? `Use safer listening recovery for ${profile.inputMode}/${profile.language}.`
        : status === 'challenge_ready'
          ? `The learner can cautiously increase challenge for ${profile.inputMode}/${profile.language}.`
          : `Keep a stable adaptive listening plan for ${profile.inputMode}/${profile.language}.`;

  return {
    status,
    headline,
    primaryFinding: needsImprovement[0] ?? positiveSignals[0] ?? profile.recommendation.summary,
    nextBestAction: `${recommendedNextExercise.difficulty.toUpperCase()} next exercise: ${recommendedNextExercise.why}`,
    reportReadingOrder: [
      'Read executiveSummary first.',
      'Use adaptiveLoopBreakdown to understand which component owns each decision.',
      'Use componentDiagnostics for summarized LLM/planner/controller/runtime/benchmark signals.',
      'Use technicalDebugData only when the summarized diagnostics are not enough.',
    ],
  };
}
