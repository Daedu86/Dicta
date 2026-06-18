import {
  buildBrowserTtsPlaybackPlanAccuracyState,
} from './browserTtsPlaybackPlanAccuracyState';
import {
  planBrowserTtsPlaybackCandidateChunk,
  planBrowserTtsPlaybackDecisionChunk,
} from './browserTtsPlaybackPlanChunkPlanning';
import type {
  BrowserTtsPlaybackPlan,
  BrowserTtsPlaybackPlanInput,
} from './browserTtsPlaybackPlanTypes';
import { buildBrowserTtsRuntimeDecisionPipeline } from './browserTtsPlaybackDecisionPipeline';
import { resolveBrowserTtsPlaybackPauseMs } from './browserTtsPlaybackLoopPauseModel';
import { resolveBrowserTtsCandidateDecision } from './browserTtsPlaybackPlanCandidateDecision';
import { buildBrowserTtsPlanChunkTelemetry } from './browserTtsPlaybackPlanChunkTelemetry';
import { planBrowserTtsSurgicalReplay } from './browserTtsSurgicalReplayPlan';

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

  const recoverySafeBoundary = false;
  const {
    accuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    nextAccuracyWindow,
    typedWordsNow,
    matchedWordsNow,
  } = buildBrowserTtsPlaybackPlanAccuracyState(input);
  const germanShortBias = false;
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
  const pauseResolution = resolveBrowserTtsPlaybackPauseMs({
    pauseClass: chunk.v3Prosody?.pauseClass,
    fallbackPauseMs: runtimeDecision.shouldPauseNow ? runtimeDecision.pauseAfterPhraseMs : 0,
    controllerPauseMs: runtimeDecision.shouldPauseNow ? runtimeDecision.pauseAfterPhraseMs : 0,
    extendWithControllerPause: shouldExtendV3PauseWithContinuousTarget(runtimeDecision),
  });
  const effectivePauseNow = pauseAtBoundary && pauseResolution.pauseMs > 0;
  const pauseBeforeNextChunkMs = effectivePauseNow ? pauseResolution.pauseMs : 0;
  const chunkTelemetry = buildBrowserTtsPlanChunkTelemetry({
    input,
    chunk,
    accuracy,
    rate,
    nextUnsafeChunkCount,
  });
  const surgicalReplayPlan = planBrowserTtsSurgicalReplay({
    chunk,
    macroWords: input.macroWords,
    macroStartWordIndex: input.macroStartWordIndex,
  });

  return {
    candidateChunk,
    chunk,
    surgicalReplayPlan,
    rawDecision,
    decision,
    runtimeDecision,
    pacingMode,
    pauseAtBoundary,
    semanticCompleteness,
    rate,
    effectivePauseNow,
    pauseBeforeNextChunkMs,
    pauseResolution,
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

function shouldExtendV3PauseWithContinuousTarget(runtimeDecision: { mode: string; pauseAfterPhraseMs: number; pacingOutput?: { perceptualPauseLevel: number } }): boolean {
  if (runtimeDecision.pacingOutput) {
    return runtimeDecision.pacingOutput.perceptualPauseLevel >= 0.1 || runtimeDecision.pauseAfterPhraseMs >= 500;
  }

  return runtimeDecision.mode === 'support' || runtimeDecision.mode === 'recovery';
}
