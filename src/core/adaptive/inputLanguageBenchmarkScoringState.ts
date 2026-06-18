import type {
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  LanguageCode,
} from './types';

export type InputLanguageBenchmarkSemanticCounters = Pick<
  InputLanguageBenchmarkMetrics,
  | 'semanticCutPenalty'
  | 'unsafePauseCount'
  | 'safePauseCount'
  | 'deferredPauseCount'
  | 'replayDeniedByBoundaryCount'
>;

export type InputLanguageBenchmarkScoringState = {
  usesQualityGateScoring: boolean;
  scoringTimeline: AdaptiveTimelinePoint[];
  rawLagSeries: number[];
  stableLagSeries: number[];
  absoluteStableLagSeries: number[];
  stableLagOutlierCount: number;
  currentPointIsScored: boolean;
  sampleCount: number;
  hasScoringSamples: boolean;
  previousAverageCount: number;
  latestScoredPoint?: AdaptiveTimelinePoint;
  semanticCounters: InputLanguageBenchmarkSemanticCounters;
};

export function buildInputLanguageBenchmarkScoringState({
  current,
  language,
  timeline,
  timelinePoint,
  semanticCutPenalty,
  unsafePause,
  safePause,
  deferPauseUntilSafeBoundary,
  replayDenied,
}: {
  current: InputLanguageBenchmarkMetrics;
  language: LanguageCode;
  timeline: AdaptiveTimelinePoint[];
  timelinePoint: AdaptiveTimelinePoint;
  semanticCutPenalty: number;
  unsafePause: boolean;
  safePause: boolean;
  deferPauseUntilSafeBoundary: boolean;
  replayDenied: boolean;
}): InputLanguageBenchmarkScoringState {
  void language;
  const usesQualityGateScoring = true;
  const scoringTimeline = timeline.filter((point) => point.acceptedForBenchmark !== false);
  const rawLagSeries = scoringTimeline.map((point) => point.rawLagSec ?? point.lagSec);
  const stableLagSeries = scoringTimeline.map((point) => point.stableLagSec ?? point.lagSec);
  const absoluteStableLagSeries = stableLagSeries.map((value) => Math.abs(value));
  const stableLagOutlierCount = rawLagSeries.filter((value) => Math.abs(value) > 5).length;
  const currentPointIsScored = timelinePoint.acceptedForBenchmark !== false;
  const sampleCount = scoringTimeline.length;
  const hasScoringSamples = scoringTimeline.length > 0;
  const previousAverageCount = current.sampleCount;
  const latestScoredPoint = scoringTimeline[scoringTimeline.length - 1];
  const semanticCounters = buildInputLanguageBenchmarkSemanticCounters({
    current,
    scoringTimeline,
    usesQualityGateScoring,
    hasScoringSamples,
    semanticCutPenalty,
    unsafePause,
    safePause,
    deferPauseUntilSafeBoundary,
    replayDenied,
  });

  return {
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
  };
}

function buildInputLanguageBenchmarkSemanticCounters({
  current,
  scoringTimeline,
  usesQualityGateScoring,
  hasScoringSamples,
  semanticCutPenalty,
  unsafePause,
  safePause,
  deferPauseUntilSafeBoundary,
  replayDenied,
}: {
  current: InputLanguageBenchmarkMetrics;
  scoringTimeline: AdaptiveTimelinePoint[];
  usesQualityGateScoring: boolean;
  hasScoringSamples: boolean;
  semanticCutPenalty: number;
  unsafePause: boolean;
  safePause: boolean;
  deferPauseUntilSafeBoundary: boolean;
  replayDenied: boolean;
}): InputLanguageBenchmarkSemanticCounters {
  if (usesQualityGateScoring && hasScoringSamples) {
    return computeSemanticCountersFromTimeline(scoringTimeline);
  }

  if (usesQualityGateScoring) {
    return {
      semanticCutPenalty: current.semanticCutPenalty,
      unsafePauseCount: current.unsafePauseCount,
      safePauseCount: current.safePauseCount,
      deferredPauseCount: current.deferredPauseCount,
      replayDeniedByBoundaryCount: current.replayDeniedByBoundaryCount,
    };
  }

  return {
    semanticCutPenalty: current.semanticCutPenalty + semanticCutPenalty,
    unsafePauseCount: current.unsafePauseCount + (unsafePause ? 1 : 0),
    safePauseCount: current.safePauseCount + (safePause ? 1 : 0),
    deferredPauseCount: current.deferredPauseCount + (deferPauseUntilSafeBoundary ? 1 : 0),
    replayDeniedByBoundaryCount: current.replayDeniedByBoundaryCount + (replayDenied ? 1 : 0),
  };
}

function computeSemanticCountersFromTimeline(timeline: AdaptiveTimelinePoint[]): InputLanguageBenchmarkSemanticCounters {
  const unsafePauseCount = timeline.filter((point) => point.event === 'pause' && point.phraseBoundaryType === 'unsafe').length;
  const safePauseCount = timeline.filter((point) => point.event === 'pause' && point.phraseBoundaryType !== 'unsafe').length;
  const deferredPauseCount = timeline.filter((point) => point.event === 'defer_pause').length;
  const replayDeniedByBoundaryCount = timeline.filter(
    (point) => point.event === 'replay' && ((point.semanticCompleteness ?? 1) < 0.65 || point.phraseBoundaryType === 'unsafe'),
  ).length;
  return {
    semanticCutPenalty: unsafePauseCount + deferredPauseCount * 0.35 + replayDeniedByBoundaryCount * 0.5,
    unsafePauseCount,
    safePauseCount,
    deferredPauseCount,
    replayDeniedByBoundaryCount,
  };
}
