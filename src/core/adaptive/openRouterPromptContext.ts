import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  ListeningTrainingPrescription,
} from './types';

type CompactPromptPackageArgs = {
  compactBenchmark: string;
  compactSessionFeedback: string;
  llmPrompt: string;
};

type CompactAdaptiveV2ContextArgs = {
  normalizedProfile: InputLanguageBenchmarkMetrics;
  sessionFeedback: AdaptiveSessionFeedback | null;
  trainingPrescription: ListeningTrainingPrescription;
};

export function buildCompactBenchmarkContext(normalizedProfile: InputLanguageBenchmarkMetrics): string {
  return JSON.stringify(
    {
      profileKey: `${normalizedProfile.inputMode}/${normalizedProfile.language}`,
      sessionCount: normalizedProfile.sessionCount,
      sampleCount: normalizedProfile.sampleCount,
      lastUpdatedAt: normalizedProfile.lastUpdatedAt ?? null,
      recommendation: normalizedProfile.recommendation,
      weakAreas: normalizedProfile.weakAreas,
      kpis: {
        sweetSpotScore: normalizedProfile.sweetSpotScore,
        semanticFidelityScore: normalizedProfile.semanticFidelityScore,
        controlFidelityScore: normalizedProfile.controlFidelityScore,
        learningEffectivenessScore: normalizedProfile.learningEffectivenessScore,
        flowStabilityScore: normalizedProfile.flowStabilityScore,
        averageAccuracy: normalizedProfile.averageAccuracy,
        averageWpm: normalizedProfile.averageWpm,
        averageLagSec: normalizedProfile.averageLagSec,
        preferredPlaybackRate: normalizedProfile.preferredPlaybackRate,
        preferredPhraseSize: normalizedProfile.preferredPhraseSize,
      },
    },
    null,
    2,
  );
}

export function buildCompactSessionFeedbackContext(sessionFeedback: AdaptiveSessionFeedback | null): string {
  return JSON.stringify(buildCompactSessionFeedback(sessionFeedback), null, 2);
}

export function buildCompactPromptPackage({
  compactBenchmark,
  compactSessionFeedback,
  llmPrompt,
}: CompactPromptPackageArgs): string {
  return JSON.stringify(
    {
      benchmark: JSON.parse(compactBenchmark) as Record<string, unknown>,
      latestSessionFeedback: JSON.parse(compactSessionFeedback) as Record<string, unknown>,
      llmPrompt,
    },
    null,
    2,
  );
}

export function buildCompactAdaptiveV2Context({
  normalizedProfile,
  sessionFeedback,
  trainingPrescription,
}: CompactAdaptiveV2ContextArgs): string {
  return JSON.stringify(
    {
      profileKey: `${normalizedProfile.inputMode}/${normalizedProfile.language}`,
      inputMode: normalizedProfile.inputMode,
      language: normalizedProfile.language,
      trainingPrescription: {
        mode: trainingPrescription.mode,
        userIntent: trainingPrescription.userIntent,
        difficulty: trainingPrescription.difficulty,
        durationMinutes: trainingPrescription.durationMinutes,
        targetAccuracyBand: trainingPrescription.targetAccuracyBand,
        targetLagMaxSec: trainingPrescription.targetLagMaxSec,
        targetRateRange: trainingPrescription.targetRateRange,
        targetPauseMs: trainingPrescription.targetPauseMs,
        targetPhraseSize: trainingPrescription.targetPhraseSize,
        phraseDifficultyRange: trainingPrescription.phraseDifficultyRange,
        phrasePolicy: trainingPrescription.phrasePolicy,
        boundaryPolicy: trainingPrescription.boundaryPolicy,
        contentGuidance: trainingPrescription.contentGuidance.slice(0, 4),
      },
      learnerSignals: {
        sessionCount: normalizedProfile.sessionCount,
        sampleCount: normalizedProfile.sampleCount,
        recommendationConfidence: normalizedProfile.recommendation.confidence,
        recommendationSummary: normalizedProfile.recommendation.summary,
        nextTrainingFocus: normalizedProfile.recommendation.nextTrainingFocus.slice(0, 4),
        weakAreas: normalizedProfile.weakAreas.slice(0, 6),
        averageAccuracy: normalizedProfile.averageAccuracy,
        averageWpm: normalizedProfile.averageWpm,
        averageLagSec: normalizedProfile.averageLagSec,
        flowStabilityScore: normalizedProfile.flowStabilityScore,
        preferredPlaybackRate: normalizedProfile.preferredPlaybackRate,
        preferredPhraseSize: normalizedProfile.preferredPhraseSize,
        preferredPauseAfterPhraseMs: normalizedProfile.preferredPauseAfterPhraseMs,
      },
      ...(sessionFeedback
        ? {
            latestSessionFeedback: buildCompactAdaptiveV2SessionFeedback(sessionFeedback),
          }
        : {}),
    },
    null,
    2,
  );
}

function buildCompactAdaptiveV2SessionFeedback(sessionFeedback: AdaptiveSessionFeedback): Record<string, unknown> {
  return {
    verdict: sessionFeedback.verdict,
    improvementDelta: {
      accuracyDelta: sessionFeedback.improvementDelta.accuracyDelta,
      lagDelta: sessionFeedback.improvementDelta.lagDelta,
      wpmDelta: sessionFeedback.improvementDelta.wpmDelta,
      overallImprovementScore: sessionFeedback.improvementDelta.overallImprovementScore,
    },
    playbackIssues: {
      repeatedPhraseCount: sessionFeedback.playbackIssues.repeatedPhraseCount,
      skippedPhraseCount: sessionFeedback.playbackIssues.skippedPhraseCount,
      phraseIndexJumpCount: sessionFeedback.playbackIssues.phraseIndexJumpCount,
    },
    phraseStats: sessionFeedback.phraseStats,
    notes: sessionFeedback.notes.slice(0, 3),
  };
}

function buildCompactSessionFeedback(sessionFeedback: AdaptiveSessionFeedback | null): Record<string, unknown> {
  if (!sessionFeedback) return { verdict: 'n/a' };

  return {
    verdict: sessionFeedback.verdict,
    improvementDelta: sessionFeedback.improvementDelta,
    playbackIssues: {
      repeatedPhraseCount: sessionFeedback.playbackIssues.repeatedPhraseCount,
      maxRepeatCountForSinglePhrase: sessionFeedback.playbackIssues.maxRepeatCountForSinglePhrase,
      skippedPhraseCount: sessionFeedback.playbackIssues.skippedPhraseCount,
      outOfOrderAdvanceCount: sessionFeedback.playbackIssues.outOfOrderAdvanceCount,
      replayAdvancedPhraseCount: sessionFeedback.playbackIssues.replayAdvancedPhraseCount,
      phraseIndexJumpCount: sessionFeedback.playbackIssues.phraseIndexJumpCount,
    },
    phraseStats: sessionFeedback.phraseStats,
    notes: sessionFeedback.notes.slice(0, 8),
  };
}
