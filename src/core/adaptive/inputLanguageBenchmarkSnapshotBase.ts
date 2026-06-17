import type {
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  LiveTelemetryFrame,
  PacingDecision,
} from './types';
import type { BrowserTtsEnvironmentBenchmarkState } from './inputLanguageBenchmarkEnvironment';
import type { InputLanguageBenchmarkScoringState } from './inputLanguageBenchmarkScoringState';
import { average, percentile, runningAverage } from './inputLanguageBenchmarkMath';
import { countUniqueSessions } from './inputLanguageBenchmarkTimeline';
import { computeAverageInputExecutionFidelity } from './inputLanguageBenchmarkExecution';

type BuildBenchmarkSnapshotBaseArgs = {
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
};

export function buildBenchmarkSnapshotBase({
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
}: BuildBenchmarkSnapshotBaseArgs): InputLanguageBenchmarkMetrics {
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
