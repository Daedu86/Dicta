import type {
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  LanguageCode,
} from './types';
import {
  computeBrowserTtsDeSemanticCounters,
  dedupeBrowserTtsDeScoringTimeline,
  isBrowserTtsDe,
  isValidBrowserTtsDeBenchmarkSample,
} from './browserTtsDeBenchmarkPolicy';

export type InputLanguageBenchmarkSemanticCounters = Pick<
  InputLanguageBenchmarkMetrics,
  | 'semanticCutPenalty'
  | 'unsafePauseCount'
  | 'safePauseCount'
  | 'deferredPauseCount'
  | 'replayDeniedByBoundaryCount'
>;

export type InputLanguageBenchmarkScoringState = {
  usesFilteredBrowserTtsDeScoring: boolean;
  scoringTimeline: AdaptiveTimelinePoint[];
  rawLagSeries: number[];
  stableLagSeries: number[];
  absoluteStableLagSeries: number[];
  stableLagOutlierCount: number;
  currentPointIsScored: boolean;
  sampleCount: number;
  hasBrowserTtsDeScoringSamples: boolean;
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
  const usesFilteredBrowserTtsDeScoring = isBrowserTtsDe(timelinePoint.inputMode, language);
  const scoringTimeline = usesFilteredBrowserTtsDeScoring
    ? dedupeBrowserTtsDeScoringTimeline(timeline.filter(isValidBrowserTtsDeBenchmarkSample))
    : timeline;
  const rawLagSeries = scoringTimeline.map((point) => point.rawLagSec ?? point.lagSec);
  const stableLagSeries = scoringTimeline.map((point) => point.stableLagSec ?? point.lagSec);
  const absoluteStableLagSeries = stableLagSeries.map((value) => Math.abs(value));
  const stableLagOutlierCount = rawLagSeries.filter((value) => Math.abs(value) > 5).length;
  const currentPointIsScored = !usesFilteredBrowserTtsDeScoring || isValidBrowserTtsDeBenchmarkSample(timelinePoint);
  const sampleCount = usesFilteredBrowserTtsDeScoring ? scoringTimeline.length : current.sampleCount + 1;
  const hasBrowserTtsDeScoringSamples = !usesFilteredBrowserTtsDeScoring || scoringTimeline.length > 0;
  const previousAverageCount = current.sampleCount;
  const latestScoredPoint = scoringTimeline[scoringTimeline.length - 1];
  const semanticCounters = buildInputLanguageBenchmarkSemanticCounters({
    current,
    scoringTimeline,
    usesFilteredBrowserTtsDeScoring,
    hasBrowserTtsDeScoringSamples,
    semanticCutPenalty,
    unsafePause,
    safePause,
    deferPauseUntilSafeBoundary,
    replayDenied,
  });

  return {
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
  };
}

function buildInputLanguageBenchmarkSemanticCounters({
  current,
  scoringTimeline,
  usesFilteredBrowserTtsDeScoring,
  hasBrowserTtsDeScoringSamples,
  semanticCutPenalty,
  unsafePause,
  safePause,
  deferPauseUntilSafeBoundary,
  replayDenied,
}: {
  current: InputLanguageBenchmarkMetrics;
  scoringTimeline: AdaptiveTimelinePoint[];
  usesFilteredBrowserTtsDeScoring: boolean;
  hasBrowserTtsDeScoringSamples: boolean;
  semanticCutPenalty: number;
  unsafePause: boolean;
  safePause: boolean;
  deferPauseUntilSafeBoundary: boolean;
  replayDenied: boolean;
}): InputLanguageBenchmarkSemanticCounters {
  if (usesFilteredBrowserTtsDeScoring && hasBrowserTtsDeScoringSamples) {
    return computeBrowserTtsDeSemanticCounters(scoringTimeline);
  }

  if (usesFilteredBrowserTtsDeScoring) {
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
