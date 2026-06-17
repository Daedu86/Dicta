import { buildBrowserTtsChunkAccuracySnapshot } from './browserTtsChunkAccuracy';
import {
  selectBrowserTtsCandidateChunk,
  selectBrowserTtsDecisionChunk,
  shouldApplyGermanShortBias,
  shouldUseBrowserTtsRecoverySafeChunks,
} from './browserTtsPlaybackPlanChunkSelection';
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
    macroWords,
    macroWordOffset,
    macroStartWordIndex,
    language,
    lastPhraseSize,
    lastBoundaryStrictness,
    liveSignal,
    browserTtsProfile,
    browserTtsBenchmark,
    browserTtsRecovery,
    ttsSpeechRate,
    unsafeChunkCount,
    accuracyWindow,
    lastAccuracySnapshot,
    navigatorInfo,
    chunkPlanner,
  } = input;

  const useBrowserTtsDeRecoverySafeChunks = shouldUseBrowserTtsRecoverySafeChunks(language, browserTtsRecovery);
  const {
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    nextAccuracyWindow,
    typedWordsNow,
    matchedWordsNow,
  } = buildBrowserTtsChunkAccuracySnapshot({
    liveSignal,
    livePracticeEvaluation: input.livePracticeEvaluation,
    accuracyWindow,
    lastAccuracySnapshot,
  });
  const accuracy = {
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
  };
  const germanShortBias = shouldApplyGermanShortBias(liveSignal, browserTtsProfile);

  const candidateChunk = selectBrowserTtsCandidateChunk({
    macroWords,
    macroWordOffset,
    macroStartWordIndex,
    language,
    phraseSize: lastPhraseSize,
    boundaryStrictness: lastBoundaryStrictness,
    germanShortBias,
    recovery: browserTtsRecovery,
    recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
    chunkPlanner,
  });

  if (!candidateChunk) {
    return null;
  }

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
  const chunk = selectBrowserTtsDecisionChunk({
    macroWords,
    macroWordOffset,
    macroStartWordIndex,
    language,
    phraseSize: decision.nextPhraseSize,
    boundaryStrictness: decision.boundaryStrictness,
    germanShortBias,
    recovery: browserTtsRecovery,
    recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
    chunkPlanner,
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
    recoverySafeBoundary: useBrowserTtsDeRecoverySafeChunks,
  };
}
