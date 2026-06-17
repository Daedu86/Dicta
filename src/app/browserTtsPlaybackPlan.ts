import {
  buildBrowserTtsPlaybackPlanAccuracyState,
} from './browserTtsPlaybackPlanAccuracyState';
import {
  planBrowserTtsPlaybackCandidateChunk,
  planBrowserTtsPlaybackDecisionChunk,
  shouldApplyGermanShortBias,
  shouldUseBrowserTtsRecoverySafeChunks,
} from './browserTtsPlaybackPlanChunkPlanning';
import type {
  BrowserTtsPlaybackPlan,
  BrowserTtsPlaybackPlanInput,
} from './browserTtsPlaybackPlanTypes';
import { buildBrowserTtsRuntimeDecisionPipeline } from './browserTtsPlaybackDecisionPipeline';
import { resolveBrowserTtsCandidateDecision } from './browserTtsPlaybackPlanCandidateDecision';
import { buildBrowserTtsPlanChunkTelemetry } from './browserTtsPlaybackPlanChunkTelemetry';

export type {
  BrowserTtsBoundaryStrictness,
  BrowserTtsChunkPlanner,
  BrowserTtsPlaybackPlan,
  BrowserTtsPlaybackPlanInput,
} from './browserTtsPlaybackPlanTypes';

export function buildBrowserTtsPlaybackPlan(input: BrowserTtsPlaybackPlanInput): BrowserTtsPlaybackPlan | null {
  const {
    liveSignal,
    browserTtsProfile,
    browserTtsBenchmark,
    browserTtsRecovery,
    ttsSpeechRate,
    unsafeChunkCount,
    navigatorInfo,
  } = input;

  const recoverySafeBoundary = shouldUseBrowserTtsRecoverySafeChunks(input.language, browserTtsRecovery);
  const {
    accuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    nextAccuracyWindow,
    typedWordsNow,
    matchedWordsNow,
  } = buildBrowserTtsPlaybackPlanAccuracyState(input);
  const germanShortBias = shouldApplyGermanShortBias(liveSignal, browserTtsProfile);
  const candidateChunk = planBrowserTtsPlaybackCandidateChunk(
    input,
    germanShortBias,
    recoverySafeBoundary,
  );

  if (!candidateChunk) return null;

  const {
    browserTelemetry,
    rawDecision,
    decision,
    pacingMode,
  } = resolveBrowserTtsCandidateDecision({
    input,
    candidateChunk,
    accuracy,
  });
  const chunk = planBrowserTtsPlaybackDecisionChunk({
    input,
    decision,
    germanShortBias,
    recoverySafeBoundary,
    fallbackChunk: candidateChunk,
  });

  const pauseAtBoundary = chunk.canPauseAfter ?? true;
  const semanticCompleteness = chunk.semanticCompleteness ?? 1;
  const {
    runtimeDecision,
    unsafeBoundaryApplied,
    mobileFallbackApplied,
  } = buildBrowserTtsRuntimeDecisionPipeline({
    decision,
    browserTtsBenchmark,
    browserTtsRecovery,
    browserTtsProfile,
    liveSignal,
    rollingAccuracyLast3,
    navigatorInfo,
    chunk,
    ttsSpeechRate,
  });
  const nextUnsafeChunkCount = unsafeChunkCount + (unsafeBoundaryApplied ? 1 : 0);
  const rate = runtimeDecision.playbackRate;
  const effectivePauseNow = runtimeDecision.shouldPauseNow && pauseAtBoundary;
  const chunkTelemetry = buildBrowserTtsPlanChunkTelemetry({
    input,
    chunk,
    accuracy,
    rate,
    nextUnsafeChunkCount,
  });

  return {
    candidateChunk,
    chunk,
    rawDecision,
    decision,
    runtimeDecision,
    pacingMode,
    pauseAtBoundary,
    semanticCompleteness,
    rate,
    effectivePauseNow,
    effectiveReplay: false,
    browserTelemetry,
    chunkTelemetry,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    nextAccuracyWindow,
    typedWordsNow,
    matchedWordsNow,
    nextLastPhraseSize: runtimeDecision.nextPhraseSize,
    nextLastBoundaryStrictness: runtimeDecision.boundaryStrictness,
    unsafeBoundaryApplied,
    unsafeChunkCount: nextUnsafeChunkCount,
    mobileFallbackApplied,
    germanShortBias,
    recoverySafeBoundary,
  };
}
