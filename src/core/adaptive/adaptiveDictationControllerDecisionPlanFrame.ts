import type { AdaptivePacingInput } from './types';
import { transitionAdaptiveControllerFrames } from './adaptiveDictationControllerFrames';
import {
  applyUnsupportedPhraseReplayFallback,
  resolveAdaptivePauseReplayPolicy,
} from './adaptiveDictationControllerPlaybackPolicy';
import type { AdaptiveDictationControllerState } from './adaptiveDictationControllerState';
import { resolveAdaptiveControllerPhraseContext } from './adaptiveDictationControllerPhraseContext';
import { resolveAdaptiveControllerPhraseSize } from './adaptiveDictationControllerPhraseSize';
import type { AdaptiveControllerRuntime } from './adaptiveDictationControllerDecisionPlanTypes';

interface BuildAdaptiveDecisionFramePlanInput {
  input: AdaptivePacingInput;
  state: AdaptiveDictationControllerState;
  runtime: AdaptiveControllerRuntime;
  playbackRate: number;
}

export function buildAdaptiveDecisionFramePlan({
  input,
  state,
  runtime,
  playbackRate: initialPlaybackRate,
}: BuildAdaptiveDecisionFramePlanInput) {
  const {
    live,
    history,
    adaptiveComfort,
    supportRateFloor,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    supportsPhraseReplay,
    chosenMode,
  } = runtime;
  const phraseContext = resolveAdaptiveControllerPhraseContext(live, history, rollingAccuracyLast3);
  const {
    canReplayIndependently,
    semanticCompleteness,
    phraseOverload,
    longPhraseSensitive,
  } = phraseContext;
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

  const {
    mode,
    progressGap,
    userIsStruggling,
    flowBlockedAfterRecovery,
    stableRecoveryConfirmed,
  } = frameTransition;
  const pauseReplayPolicy = resolveAdaptivePauseReplayPolicy({
    mode,
    live,
    rollingAccuracyLast3,
    userIsStruggling,
    struggleFrames: frameTransition.frameState.struggleFrames,
    supportsPhraseReplay,
    adaptiveComfort,
  });
  let pauseAfterPhraseMs = pauseReplayPolicy.pauseAfterPhraseMs;
  let nextPhraseSize = resolveAdaptiveControllerPhraseSize({
    mode,
    input,
    phraseOverload,
    longPhraseSensitive,
    semanticCompleteness,
    rollingAccuracyLast3,
    recoveryFrames: frameTransition.frameState.recoveryFrames,
    flowLockFrames: frameTransition.frameState.flowLockFrames,
  });
  const replayFallback = applyUnsupportedPhraseReplayFallback({
    supportsPhraseReplay,
    replayWanted: pauseReplayPolicy.replayWanted,
    nextPhraseSize,
    playbackRate: initialPlaybackRate,
    pauseAfterPhraseMs,
    supportRateFloor,
    adaptiveComfort,
  });
  nextPhraseSize = replayFallback.nextPhraseSize;
  pauseAfterPhraseMs = replayFallback.pauseAfterPhraseMs;

  return {
    ...phraseContext,
    ...pauseReplayPolicy,
    frameState: frameTransition.frameState,
    flowBlockedAfterRecovery,
    mode,
    nextPhraseSize,
    pauseAfterPhraseMs,
    playbackRate: replayFallback.playbackRate,
    progressGap,
    stableRecoveryConfirmed,
    supportsPhraseReplay,
  };
}

export type AdaptiveDecisionFramePlan = ReturnType<typeof buildAdaptiveDecisionFramePlan>;
