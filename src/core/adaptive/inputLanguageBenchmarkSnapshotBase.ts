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
    usesQualityGateScoring,
    scoringTimeline,
    rawLagSeries,
    stableLagSeries,
    absoluteStableLagSeries,
    stableLagOutlierCount,
    currentPointIsScored,
    sampleCount,
    hasScoringSamples,
    previousAverageCount,
    latestScoredPoint,
    semanticCounters,
  } = scoringState;

  return {
    ...current,
    sessionCount: countUniqueSessions(usesQualityGateScoring ? scoringTimeline : timeline),
    sampleCount,
    lastUpdatedAt: new Date(timestampMs).toISOString(),
    averageAccuracy: usesQualityGateScoring && hasScoringSamples
      ? average(scoringTimeline.map((point) => point.accuracy))
      : usesQualityGateScoring
        ? current.averageAccuracy
        : runningAverage(current.averageAccuracy, live.accuracy, previousAverageCount),
    averageWpm: usesQualityGateScoring && hasScoringSamples
      ? average(scoringTimeline.map((point) => point.wpm))
      : usesQualityGateScoring
        ? current.averageWpm
        : runningAverage(current.averageWpm, live.wpm, previousAverageCount),
    averageLagSec: hasScoringSamples ? average(stableLagSeries) : current.averageLagSec,
    rawAverageLagSec: hasScoringSamples ? average(rawLagSeries) : current.rawAverageLagSec,
    stableAverageLagSec: hasScoringSamples ? average(stableLagSeries) : current.stableAverageLagSec,
    medianLagSec: hasScoringSamples ? percentile(stableLagSeries, 0.5) : current.medianLagSec,
    p75LagSec: hasScoringSamples ? percentile(stableLagSeries, 0.75) : current.p75LagSec,
    p90AbsLagSec: hasScoringSamples ? percentile(absoluteStableLagSeries, 0.9) : current.p90AbsLagSec,
    lagOutlierCount: hasScoringSamples ? stableLagOutlierCount : current.lagOutlierCount,
    averageCorrectionRate: usesQualityGateScoring && hasScoringSamples
      ? average(scoringTimeline.map((point) => point.correctionRate ?? 0))
      : usesQualityGateScoring
        ? current.averageCorrectionRate
        : runningAverage(current.averageCorrectionRate, live.correctionRate, previousAverageCount),
    semanticCutPenalty: semanticCounters.semanticCutPenalty,
    unsafePauseCount: semanticCounters.unsafePauseCount,
    safePauseCount: semanticCounters.safePauseCount,
    deferredPauseCount: semanticCounters.deferredPauseCount,
    replayDeniedByBoundaryCount: semanticCounters.replayDeniedByBoundaryCount,
    averageSemanticCompleteness: usesQualityGateScoring && hasScoringSamples
      ? average(scoringTimeline.map((point) => point.semanticCompleteness ?? 1)) || 1
      : usesQualityGateScoring
        ? current.averageSemanticCompleteness
        : runningAverage(current.averageSemanticCompleteness, semanticCompleteness, previousAverageCount),
    averagePhraseDifficulty: usesQualityGateScoring
      ? currentPointIsScored
        ? runningAverage(current.averagePhraseDifficulty, phraseDifficulty, previousAverageCount)
        : current.averagePhraseDifficulty
      : runningAverage(current.averagePhraseDifficulty, phraseDifficulty, previousAverageCount),
    preferredPlaybackRate: usesQualityGateScoring
      ? (latestScoredPoint?.playbackRate ?? current.preferredPlaybackRate)
      : decision.playbackRate,
    preferredPhraseSize: decision.nextPhraseSize,
    preferredPauseAfterPhraseMs: usesQualityGateScoring
      ? (latestScoredPoint?.pauseMs ?? current.preferredPauseAfterPhraseMs)
      : decision.pauseAfterPhraseMs,
    inputExecutionFidelityScore: usesQualityGateScoring
      ? hasScoringSamples
        ? computeAverageInputExecutionFidelity(scoringTimeline)
        : current.inputExecutionFidelityScore
      : currentPointIsScored
      ? runningAverage(current.inputExecutionFidelityScore, executionFidelity, previousAverageCount)
      : current.inputExecutionFidelityScore,
    timeline,
    ...environmentState,
  };
}
