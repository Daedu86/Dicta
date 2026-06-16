import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from './types';
import type { AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';
import { normalizePercent } from './adaptiveUserSystemReportSessionSummary';

export function buildRecommendedNextExercise(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  repeatCount: number,
  focus: string[],
): AdaptiveUserSystemReport['userProgressSummary']['recommendedNextExercise'] {
  const accuracy = session ? Number.parseFloat(session.accuracy) : normalizePercent(profile.averageAccuracy);
  const lag = session ? Math.abs(Number.parseFloat(session.lag)) : Math.abs(profile.averageLagSec);
  const shouldLower = accuracy < 78 || lag > 4 || repeatCount > 5 || profile.weakAreas.includes('low_accuracy');
  const canRaise = accuracy >= 92 && lag <= 1.5 && repeatCount <= 1 && !profile.weakAreas.includes('lag') && !profile.weakAreas.includes('low_accuracy');
  const difficulty = shouldLower ? 'easy' : canRaise ? 'hard' : 'normal';
  const contentGuidance =
    difficulty === 'easy'
      ? ['Use everyday vocabulary.', 'Use shorter clauses.', 'Avoid dense sentence nesting.']
      : difficulty === 'hard'
        ? ['Increase vocabulary variety gradually.', 'Use richer grammar while preserving clear phrase boundaries.']
        : ['Use medium-complexity everyday content.', 'Keep phrases replayable and semantically complete.'];
  const pacingGuidance = [
    lag > 3 ? 'Slow playback or increase pause after phrase.' : 'Keep playback near the recommended target range.',
    repeatCount > 3 ? 'Prefer sentence/clause boundaries that can be replayed independently.' : 'Keep replay boundaries stable.',
  ];
  return {
    difficulty,
    why: shouldLower
      ? 'The learner needs more support before increasing difficulty.'
      : canRaise
        ? 'Accuracy and lag are strong enough to increase challenge gradually.'
        : 'The learner is best served by a stable medium challenge.',
    focus,
    contentGuidance,
    pacingGuidance,
  };
}

export function buildSystemWorkingSignals(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  feedback: AdaptiveSessionFeedback | null,
): string[] {
  const signals: string[] = [];
  if (profile.recommendation.confidence >= 0.45) signals.push('Recommendation confidence is usable for adaptive decisions.');
  if (profile.sampleCount > 0) signals.push(`Benchmark is receiving accepted telemetry for ${profile.inputMode}/${profile.language}.`);
  if (profile.controlFidelityScore >= 0.75) signals.push('Control fidelity indicates pacing decisions are mostly executable.');
  if (session && Number.parseFloat(session.accuracy) >= 82) signals.push('Latest session accuracy is high enough to keep adapting from user performance.');
  if (feedback && feedback.verdict !== 'regressed') signals.push('Latest feedback does not indicate a clear regression.');
  return signals.length > 0 ? signals : ['System has insufficient evidence; collect more completed sessions.'];
}

export function buildSystemTuningSignals(
  profile: InputLanguageBenchmarkMetrics,
  needsImprovement: string[],
  feedback: AdaptiveSessionFeedback | null,
): string[] {
  const tuning = [...needsImprovement];
  if (profile.recommendation.confidence < 0.3) tuning.push('Recommendation confidence is low; avoid aggressive changes.');
  if (feedback?.verdict === 'regressed') tuning.push('Latest feedback regressed; reduce challenge and inspect playback behavior.');
  return tuning.length > 0 ? tuning.slice(0, 8) : ['No urgent tuning issue detected; continue gradual adaptation.'];
}

export function buildSystemAdjustments(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  repeatCount: number,
  recommended: AdaptiveUserSystemReport['userProgressSummary']['recommendedNextExercise'],
): AdaptiveUserSystemReport['adaptiveSystemSummary']['recommendedSystemAdjustments'] {
  const targetRate = profile.recommendation.targetRateRange;
  const lag = session ? Math.abs(Number.parseFloat(session.lag)) : Math.abs(profile.averageLagSec);
  return {
    playbackRate:
      lag > 3 || profile.weakAreas.includes('high_rate')
        ? `Prefer the lower end of ${targetRate[0].toFixed(2)}x-${targetRate[1].toFixed(2)}x until lag stabilizes.`
        : `Use the recommended ${targetRate[0].toFixed(2)}x-${targetRate[1].toFixed(2)}x range.`,
    pauseAfterPhraseMs:
      lag > 3 || repeatCount > 3
        ? `Increase pause above ${profile.recommendation.targetPauseMs}ms when phrases are dense or repeated.`
        : `Keep pause near ${profile.recommendation.targetPauseMs}ms.`,
    phraseLength:
      profile.weakAreas.includes('long_phrases') || repeatCount > 3
        ? 'Use shorter phrases with sentence or clause boundaries.'
        : `Use ${profile.recommendation.targetPhraseSize} phrases.`,
    difficulty: `Generate the next exercise at ${recommended.difficulty} difficulty.`,
    replayBoundaries:
      profile.weakAreas.includes('replay') || profile.weakAreas.includes('unsafe_boundaries') || repeatCount > 3
        ? 'Prioritize independently replayable sentence/clause boundaries and avoid unsafe mid-grammar cuts.'
        : 'Keep current replay-boundary strictness unless new repeats appear.',
  };
}
