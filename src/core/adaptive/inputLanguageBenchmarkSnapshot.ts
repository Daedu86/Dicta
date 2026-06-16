import type {
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  LiveTelemetryFrame,
  PacingDecision,
} from './types';
import type { BrowserTtsEnvironmentBenchmarkState } from './inputLanguageBenchmarkEnvironment';
import type { InputLanguageBenchmarkScoringState } from './inputLanguageBenchmarkScoringState';
import {
  average,
  computeVariance,
  percentile,
  runningAverage,
} from './inputLanguageBenchmarkMath';
import { countUniqueSessions } from './inputLanguageBenchmarkTimeline';
import { computeAverageInputExecutionFidelity } from './inputLanguageBenchmarkExecution';
import {
  computeErrorBurstLength,
  computeModeSwitchFrequency,
  computeRateAccuracyBuckets,
  computeRecoveryScore,
  computeTimeToRecoveryMs,
} from './inputLanguageBenchmarkTimelineAnalytics';
import {
  computeControlFidelityScore,
  computeFlowStabilityScore,
  computeLearningEffectivenessScore,
  computeSemanticFidelityScore,
  computeSweetSpotScore,
} from './inputLanguageBenchmarkAggregateScores';
import {
  computeBenchmarkRecommendation,
  deriveWeakAreas,
} from './inputLanguageBenchmarkRecommendation';

export function buildNextInputLanguageBenchmarkSnapshot({
  current,
  live,
  decision,
  timestampMs,
  timeline,
  environmentState,
  scoringState,
  semanticCompleteness,
  phraseDifficulty,
  executionFidelity,
}: {
  current: InputLanguageBenchmarkMetrics;
  live: LiveTelemetryFrame;
  decision: PacingDecision;
  timestampMs: number;
  timeline: AdaptiveTimelinePoint[];
  environmentState: BrowserTtsEnvironmentBenchmarkState;
  scoringState: InputLanguageBenchmarkScoringState;
  semanticCompleteness: number;
  phraseDifficulty: number;
  executionFidelity: number;
}): InputLanguageBenchmarkMetrics {
  const {
    usesFilteredBrowserTtsDeScoring,
    scoringTimeline,
    rawLagSeries,
    stableLagSeries,
    absoluteStableLagSeries,
    stableLagOutlierCount,
    currentPointIsScored,
    sampleCount,
    hasBrowserTtsDeScoringSamples,
    previousAverageCount,
    latestScoredPoint,
    semanticCounters,
  } = scoringState;

  return {
    ...current,
    sessionCount: countUniqueSessions(usesFilteredBrowserTtsDeScoring ? scoringTimeline : timeline),
    sampleCount,
    lastUpdatedAt: new Date(timestampMs).toISOString(),
    averageAccuracy: usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples
      ? average(scoringTimeline.map((point) => point.accuracy))
      : usesFilteredBrowserTtsDeScoring
        ? current.averageAccuracy
        : runningAverage(current.averageAccuracy, live.accuracy, previousAverageCount),
    averageWpm: usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples
      ? average(scoringTimeline.map((point) => point.wpm))
      : usesFilteredBrowserTtsDeScoring
        ? current.averageWpm
        : runningAverage(current.averageWpm, live.wpm, previousAverageCount),
    averageLagSec: hasBrowserTtsDeScoringSamples ? average(stableLagSeries) : current.averageLagSec,
    rawAverageLagSec: hasBrowserTtsDeScoringSamples ? average(rawLagSeries) : current.rawAverageLagSec,
    stableAverageLagSec: hasBrowserTtsDeScoringSamples ? average(stableLagSeries) : current.stableAverageLagSec,
    medianLagSec: hasBrowserTtsDeScoringSamples ? percentile(stableLagSeries, 0.5) : current.medianLagSec,
    p75LagSec: hasBrowserTtsDeScoringSamples ? percentile(stableLagSeries, 0.75) : current.p75LagSec,
    p90AbsLagSec: hasBrowserTtsDeScoringSamples ? percentile(absoluteStableLagSeries, 0.9) : current.p90AbsLagSec,
    lagOutlierCount: hasBrowserTtsDeScoringSamples ? stableLagOutlierCount : current.lagOutlierCount,
    averageCorrectionRate: usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples
      ? average(scoringTimeline.map((point) => point.correctionRate ?? 0))
      : usesFilteredBrowserTtsDeScoring
        ? current.averageCorrectionRate
        : runningAverage(current.averageCorrectionRate, live.correctionRate, previousAverageCount),
    semanticCutPenalty: semanticCounters.semanticCutPenalty,
    unsafePauseCount: semanticCounters.unsafePauseCount,
    safePauseCount: semanticCounters.safePauseCount,
    deferredPauseCount: semanticCounters.deferredPauseCount,
    replayDeniedByBoundaryCount: semanticCounters.replayDeniedByBoundaryCount,
    averageSemanticCompleteness: usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples
      ? average(scoringTimeline.map((point) => point.semanticCompleteness ?? 1)) || 1
      : usesFilteredBrowserTtsDeScoring
        ? current.averageSemanticCompleteness
        : runningAverage(current.averageSemanticCompleteness, semanticCompleteness, previousAverageCount),
    averagePhraseDifficulty: usesFilteredBrowserTtsDeScoring
      ? currentPointIsScored
        ? runningAverage(current.averagePhraseDifficulty, phraseDifficulty, previousAverageCount)
        : current.averagePhraseDifficulty
      : runningAverage(current.averagePhraseDifficulty, phraseDifficulty, previousAverageCount),
    preferredPlaybackRate: usesFilteredBrowserTtsDeScoring
      ? (latestScoredPoint?.playbackRate ?? current.preferredPlaybackRate)
      : decision.playbackRate,
    preferredPhraseSize: decision.nextPhraseSize,
    preferredPauseAfterPhraseMs: usesFilteredBrowserTtsDeScoring
      ? (latestScoredPoint?.pauseMs ?? current.preferredPauseAfterPhraseMs)
      : decision.pauseAfterPhraseMs,
    inputExecutionFidelityScore: usesFilteredBrowserTtsDeScoring
      ? hasBrowserTtsDeScoringSamples
        ? computeAverageInputExecutionFidelity(scoringTimeline)
        : current.inputExecutionFidelityScore
      : currentPointIsScored
      ? runningAverage(current.inputExecutionFidelityScore, executionFidelity, previousAverageCount)
      : current.inputExecutionFidelityScore,
    timeline,
    ...environmentState,
  };
}

export function preserveUnscoredBenchmarkScoreState(
  next: InputLanguageBenchmarkMetrics,
  current: InputLanguageBenchmarkMetrics,
): InputLanguageBenchmarkMetrics {
  return {
    ...next,
    rateAccuracyBuckets: current.rateAccuracyBuckets,
    recoveryScore: current.recoveryScore,
    timeToRecoveryMs: current.timeToRecoveryMs,
    errorBurstLength: current.errorBurstLength,
    modeSwitchFrequency: current.modeSwitchFrequency,
    rateVariance: current.rateVariance,
    pauseVariance: current.pauseVariance,
    semanticFidelityScore: current.semanticFidelityScore,
    controlFidelityScore: current.controlFidelityScore,
    learningEffectivenessScore: current.learningEffectivenessScore,
    flowStabilityScore: current.flowStabilityScore,
    sweetSpotScore: current.sweetSpotScore,
    weakAreas: current.weakAreas,
    recommendation: current.recommendation,
  };
}

export function applyScoredBenchmarkDerivedMetrics(
  next: InputLanguageBenchmarkMetrics,
  scoringTimeline: AdaptiveTimelinePoint[],
): InputLanguageBenchmarkMetrics {
  next.rateAccuracyBuckets = computeRateAccuracyBuckets(scoringTimeline);
  next.recoveryScore = computeRecoveryScore(scoringTimeline);
  next.timeToRecoveryMs = computeTimeToRecoveryMs(scoringTimeline);
  next.errorBurstLength = computeErrorBurstLength(scoringTimeline);
  next.modeSwitchFrequency = computeModeSwitchFrequency(scoringTimeline);
  next.rateVariance = computeVariance(scoringTimeline.map((point) => point.playbackRate));
  next.pauseVariance = computeVariance(scoringTimeline.map((point) => point.pauseMs));
  next.semanticFidelityScore = computeSemanticFidelityScore(next);
  next.controlFidelityScore = computeControlFidelityScore(next);
  next.learningEffectivenessScore = computeLearningEffectivenessScore(next);
  next.flowStabilityScore = computeFlowStabilityScore(next);
  next.sweetSpotScore = computeSweetSpotScore(next);
  next.weakAreas = deriveWeakAreas(next);
  next.recommendation = computeBenchmarkRecommendation(next);
  return next;
}
