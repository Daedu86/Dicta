import type { AdaptivePacingInput, PacingMode } from './types';
import { computeProgressGap } from './adaptiveDictationControllerMath';

export interface AdaptiveControllerFrameState {
  struggleFrames: number;
  recoveryFrames: number;
  supportFrames: number;
  balancedFrames: number;
  catchUpFrames: number;
  flowLockFrames: number;
}

export interface AdaptiveControllerFrameTransitionResult {
  frameState: AdaptiveControllerFrameState;
  mode: PacingMode;
  progressGap: number;
  userIsStruggling: boolean;
  flowBlockedAfterRecovery: boolean;
  stableRecoveryConfirmed: boolean;
}

export function transitionAdaptiveControllerFrames({
  live,
  rollingAccuracyLast3,
  rollingAccuracyLast5,
  chosenMode,
  phraseOverload,
  longPhraseSensitive,
  frameState,
}: {
  live: AdaptivePacingInput['live'];
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
  chosenMode: PacingMode;
  phraseOverload: boolean;
  longPhraseSensitive: boolean;
  frameState: AdaptiveControllerFrameState;
}): AdaptiveControllerFrameTransitionResult {
  const nextFrameState = { ...frameState };
  const progressGap = computeProgressGap(live);
  const userIsStruggling =
    live.lagSec > 2.0 ||
    rollingAccuracyLast3 < 0.82 ||
    live.correctionRate > 0.12 ||
    (live.lagSec > 1.8 && progressGap > 0.18) ||
    phraseOverload ||
    longPhraseSensitive;

  if (userIsStruggling) {
    nextFrameState.struggleFrames += 1;
    nextFrameState.recoveryFrames = 0;
  } else {
    nextFrameState.recoveryFrames += 1;
    nextFrameState.struggleFrames = 0;
  }

  const catchUpPressure =
    live.lagSec > 3.0 ||
    (live.lagSec > 2.4 && progressGap > 0.1);
  const recoveryPrecisionStable = rollingAccuracyLast3 >= 0.86 && live.correctionRate < 0.12;
  const immediateRecoveryNeeded = catchUpPressure && recoveryPrecisionStable;
  const sustainedRecoveryNeeded =
    nextFrameState.struggleFrames >= 2 &&
    recoveryPrecisionStable &&
    (live.lagSec > 2.6 || progressGap > 0.14) &&
    (live.lagSec > 1.8 && progressGap > 0.08);

  let mode: PacingMode = immediateRecoveryNeeded || sustainedRecoveryNeeded ? 'recovery' : chosenMode;
  let flowBlockedAfterRecovery = false;
  let stableRecoveryConfirmed = false;

  if (nextFrameState.flowLockFrames > 0 && mode === 'flow') {
    mode = 'balanced';
    flowBlockedAfterRecovery = true;
  }

  if (mode === 'recovery') {
    nextFrameState.catchUpFrames += 1;
    nextFrameState.flowLockFrames = Math.max(nextFrameState.flowLockFrames, 6);
    nextFrameState.supportFrames = 0;
    nextFrameState.balancedFrames = 0;
  } else if (mode === 'support') {
    nextFrameState.supportFrames += 1;
    nextFrameState.balancedFrames = 0;
    if (nextFrameState.flowLockFrames > 0) nextFrameState.flowLockFrames -= 1;
  } else {
    nextFrameState.balancedFrames += 1;
    nextFrameState.supportFrames = 0;
    if (nextFrameState.flowLockFrames > 0) nextFrameState.flowLockFrames -= 1;
  }

  if (
    mode === 'recovery' &&
    nextFrameState.recoveryFrames >= 6 &&
    rollingAccuracyLast5 > 0.9 &&
    Math.abs(live.lagSec) < 1.0 &&
    live.correctionRate < 0.08 &&
    progressGap < 0.06
  ) {
    mode = 'support';
    stableRecoveryConfirmed = true;
  }

  if (
    mode === 'support' &&
    nextFrameState.supportFrames >= 2 &&
    nextFrameState.recoveryFrames >= 5 &&
    rollingAccuracyLast5 > 0.93 &&
    Math.abs(live.lagSec) < 1.0 &&
    progressGap < 0.08
  ) {
    mode = 'balanced';
  }

  if (mode !== 'recovery' && nextFrameState.recoveryFrames >= 6 && nextFrameState.catchUpFrames > 0) {
    nextFrameState.catchUpFrames = 0;
  }

  return {
    frameState: nextFrameState,
    mode,
    progressGap,
    userIsStruggling,
    flowBlockedAfterRecovery,
    stableRecoveryConfirmed,
  };
}
