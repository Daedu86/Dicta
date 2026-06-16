import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from './types';

export function computeImprovementDelta(
  before: InputLanguageBenchmarkMetrics | null | undefined,
  after: InputLanguageBenchmarkMetrics | null | undefined,
  playbackIssues: AdaptiveSessionFeedback['playbackIssues'],
): AdaptiveSessionFeedback['improvementDelta'] {
  const accuracyDelta = metricDelta(before?.averageAccuracy, after?.averageAccuracy);
  const lagDelta = Math.abs(before?.averageLagSec ?? 0) - Math.abs(after?.averageLagSec ?? 0);
  const wpmDelta = metricDelta(before?.averageWpm, after?.averageWpm);
  const sweetSpotScoreDelta = metricDelta(before?.sweetSpotScore, after?.sweetSpotScore);
  const semanticFidelityDelta = metricDelta(before?.semanticFidelityScore, after?.semanticFidelityScore);
  const controlFidelityDelta = metricDelta(before?.controlFidelityScore, after?.controlFidelityScore);
  const learningEffectivenessDelta = metricDelta(before?.learningEffectivenessScore, after?.learningEffectivenessScore);
  const flowStabilityDelta = metricDelta(before?.flowStabilityScore, after?.flowStabilityScore);
  const issuePenalty =
    playbackIssues.repeatedPhraseCount * 0.04 +
    playbackIssues.skippedPhraseCount * 0.08 +
    playbackIssues.phraseIndexJumpCount * 0.1 +
    playbackIssues.replayAdvancedPhraseCount * 0.12;
  const positiveSignal =
    normalizeDelta(accuracyDelta, 0.1) * 0.18 +
    normalizeDelta(lagDelta, 1) * 0.18 +
    normalizeDelta(wpmDelta, 8) * 0.08 +
    normalizeDelta(sweetSpotScoreDelta, 0.2) * 0.2 +
    normalizeDelta(semanticFidelityDelta, 0.2) * 0.12 +
    normalizeDelta(controlFidelityDelta, 0.2) * 0.1 +
    normalizeDelta(learningEffectivenessDelta, 0.2) * 0.1 +
    normalizeDelta(flowStabilityDelta, 0.2) * 0.04;
  const overallImprovementScore = clamp01(0.5 + positiveSignal - issuePenalty);

  return {
    accuracyDelta,
    lagDelta,
    wpmDelta,
    sweetSpotScoreDelta,
    semanticFidelityDelta,
    controlFidelityDelta,
    learningEffectivenessDelta,
    flowStabilityDelta,
    overallImprovementScore,
  };
}

export function computeVerdict(score: number, eventCount: number): AdaptiveSessionFeedback['verdict'] {
  if (eventCount === 0) return 'inconclusive';
  if (score > 0.6) return 'improved';
  if (score >= 0.45) return 'stable';
  return 'regressed';
}

export function buildFeedbackNotes(
  issues: AdaptiveSessionFeedback['playbackIssues'],
  delta: AdaptiveSessionFeedback['improvementDelta'],
  verdict: AdaptiveSessionFeedback['verdict'],
): string[] {
  const notes = [`Verdict: ${verdict}.`];
  if (issues.maxRepeatCountForSinglePhrase > 0) {
    notes.push(`A phrase repeated ${issues.maxRepeatCountForSinglePhrase} time(s).`);
  }
  if (issues.skippedPhraseCount > 0 || issues.phraseIndexJumpCount > 0) {
    notes.push('Phrase order issues were detected.');
  }
  if (delta.accuracyDelta < 0) {
    notes.push('Accuracy moved down after this session.');
  }
  if (delta.lagDelta < 0) {
    notes.push('Lag moved farther from zero after this session.');
  }
  return notes;
}

function metricDelta(before = 0, after = 0): number {
  return after - before;
}

function normalizeDelta(value: number, scale: number): number {
  return clamp(value / Math.max(scale, 0.0001), -1, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
