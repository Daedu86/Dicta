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
      trainingPrescription,
      sessionCount: normalizedProfile.sessionCount,
      sampleCount: normalizedProfile.sampleCount,
      weakAreas: normalizedProfile.weakAreas,
      recommendation: normalizedProfile.recommendation,
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
      ...(sessionFeedback
        ? {
            latestSessionFeedback: buildCompactSessionFeedback(sessionFeedback),
          }
        : {}),
    },
    null,
    2,
  );
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
