import type { AdaptivePacingInput, PacingDecision } from './types';
import { clamp } from './adaptiveDictationControllerMath';
import type { computeAdaptivePacingScores } from './adaptiveDictationControllerTelemetry';
import { transitionAdaptiveControllerFrames } from './adaptiveDictationControllerFrames';
import {
  applyUnsupportedPhraseReplayFallback,
  resolveAdaptivePauseReplayPolicy,
} from './adaptiveDictationControllerPlaybackPolicy';
import { resolveAdaptiveControllerRatePolicy } from './adaptiveDictationControllerRatePolicy';
import { applyAdaptivePausePolicy, buildAdaptivePacingReasonArtifacts } from './adaptiveDictationControllerReasons';
import type { AdaptiveDictationControllerState } from './adaptiveDictationControllerState';
import type { resolveAdaptiveControllerRuntimeContext } from './adaptiveDictationControllerRuntimeContext';
import { resolveAdaptiveControllerPhraseContext } from './adaptiveDictationControllerPhraseContext';
import { resolveAdaptiveControllerPhraseSize } from './adaptiveDictationControllerPhraseSize';
import { buildAdaptiveDictationDecisionResult } from './adaptiveDictationControllerDecisionResult';

type AdaptiveControllerRuntime = ReturnType<typeof resolveAdaptiveControllerRuntimeContext>;
type AdaptivePacingScores = ReturnType<typeof computeAdaptivePacingScores>;

interface BuildAdaptiveDictationDecisionPlanInput {
  input: AdaptivePacingInput;
  state: AdaptiveDictationControllerState;
  runtime: AdaptiveControllerRuntime;
  scores: AdaptivePacingScores;
  initialPlaybackRate: number;
}

export function buildAdaptiveDictationDecisionPlan({
  input,
  state,
  runtime,
  scores,
  initialPlaybackRate,
}: BuildAdaptiveDictationDecisionPlanInput): PacingDecision {
  const {
    live,
    history,
    browserTtsProfile,
    adaptiveComfort,
    comfortRateMax,
    supportRateFloor,
    extremeSupportRateFloor,
    supportRateCeiling,
    balancedFlowFloor,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    supportsPhraseReplay,
    chosenMode,
    baselineRate,
  } = runtime;
  const { lagScore, accuracyScore, hesitationScore, confidenceScore } = scores;
  let playbackRate = initialPlaybackRate;

  const {
    canReplayIndependently,
    semanticCompleteness,
    phraseOverload,
    longPhraseSensitive,
  } = resolveAdaptiveControllerPhraseContext(live, history, rollingAccuracyLast3);
  const frameTransition = transitionAdaptiveControllerFrames({
    live,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    chosenMode,
    phraseOverload,
    longPhraseSensitive,
    frameState: state.getFrameState(),
  });
  state.applyFrameState(frameTransition.frameState);
  const frameState = frameTransition.frameState;

  const {
    mode,
    progressGap,
    userIsStruggling,
    flowBlockedAfterRecovery,
    stableRecoveryConfirmed,
  } = frameTransition;

  const {
    isSupportLikeMode,
    boundaryStrictness,
    allowMidPhrasePause,
    shouldPauseNow,
    deferPauseUntilSafeBoundary,
    replayWanted,
    shouldReplayPhrase,
    pauseAfterPhraseMs: initialPauseAfterPhraseMs,
  } = resolveAdaptivePauseReplayPolicy({
    mode,
    live,
    rollingAccuracyLast3,
    userIsStruggling,
    struggleFrames: frameState.struggleFrames,
    supportsPhraseReplay,
    adaptiveComfort,
  });
  let pauseAfterPhraseMs = initialPauseAfterPhraseMs;

  let nextPhraseSize = resolveAdaptiveControllerPhraseSize({
    mode,
    input,
    phraseOverload,
    longPhraseSensitive,
    semanticCompleteness,
    rollingAccuracyLast3,
    recoveryFrames: frameState.recoveryFrames,
    flowLockFrames: frameState.flowLockFrames,
  });

  const replayFallback = applyUnsupportedPhraseReplayFallback({
    supportsPhraseReplay,
    replayWanted,
    nextPhraseSize,
    playbackRate,
    pauseAfterPhraseMs,
    supportRateFloor,
    adaptiveComfort,
  });
  nextPhraseSize = replayFallback.nextPhraseSize;
  playbackRate = replayFallback.playbackRate;
  pauseAfterPhraseMs = replayFallback.pauseAfterPhraseMs;

  let replayRate = clamp(playbackRate - 0.10, balancedFlowFloor, comfortRateMax);

  const { reason, reasonCodes } = buildAdaptivePacingReasonArtifacts({
    mode,
    history,
    live,
    phraseOverload,
    longPhraseSensitive,
    shouldReplayPhrase,
    supportsPhraseReplay,
    replayWanted,
    canReplayIndependently,
    semanticCompleteness,
    rollingAccuracyLast3,
    deferPauseUntilSafeBoundary,
    flowBlockedAfterRecovery,
    stableRecoveryConfirmed,
  });

  const adaptivePauseResult = applyAdaptivePausePolicy({
    adaptivePause: browserTtsProfile?.adaptivePause,
    history,
    live,
    mode,
    rollingAccuracyLast3,
    progressGap,
    struggleFrames: frameState.struggleFrames,
    pauseAfterPhraseMs,
    reason,
    reasonCodes,
  });
  pauseAfterPhraseMs = adaptivePauseResult.pauseAfterPhraseMs;
  if (adaptiveComfort) {
    pauseAfterPhraseMs = Math.round(clamp(pauseAfterPhraseMs, adaptiveComfort.pauseRangeMs[0], adaptiveComfort.pauseRangeMs[1]));
    reason.push(`adaptive-playback-comfort-profile:${adaptiveComfort.source}`);
    reasonCodes.push('adaptive-playback-comfort-profile');
  }

  const ratePolicy = resolveAdaptiveControllerRatePolicy({
    live,
    mode,
    isSupportLikeMode,
    playbackRate,
    replayRate,
    deferPauseUntilSafeBoundary,
    rollingAccuracyLast3,
    reason,
    reasonCodes,
    extremeSupportRateFloor,
    supportRateFloor,
    supportRateCeiling,
    balancedFlowFloor,
    baselineRate,
    comfortRateMax,
  });

  const finalPlaybackRate = ratePolicy.finalPlaybackRate;
  replayRate = ratePolicy.replayRate;
  state.setPreviousRate(finalPlaybackRate);

  return buildAdaptiveDictationDecisionResult({
    mode,
    playbackRate: finalPlaybackRate,
    pauseAfterPhraseMs,
    shouldPauseNow,
    shouldReplayPhrase,
    boundaryStrictness,
    allowMidPhrasePause,
    deferPauseUntilSafeBoundary,
    replayRate,
    nextPhraseSize,
    reason,
    reasonCodes,
    lagScore,
    accuracyScore,
    hesitationScore,
    confidenceScore,
  });
}
