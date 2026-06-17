import { clamp } from './adaptiveDictationControllerMath';
import { resolveAdaptiveControllerRatePolicy } from './adaptiveDictationControllerRatePolicy';
import type { AdaptiveControllerRuntime } from './adaptiveDictationControllerDecisionPlanTypes';
import type { AdaptiveDecisionFramePlan } from './adaptiveDictationControllerDecisionPlanFrame';
import type { AdaptiveDecisionPausePlan } from './adaptiveDictationControllerDecisionPlanPause';

interface ResolveAdaptiveDecisionRatePlanInput {
  runtime: AdaptiveControllerRuntime;
  framePlan: AdaptiveDecisionFramePlan;
  pausePlan: AdaptiveDecisionPausePlan;
}

export function resolveAdaptiveDecisionRatePlan({
  runtime,
  framePlan,
  pausePlan,
}: ResolveAdaptiveDecisionRatePlanInput) {
  const {
    balancedFlowFloor,
    baselineRate,
    comfortRateMax,
    extremeSupportRateFloor,
    live,
    rollingAccuracyLast3,
    supportRateCeiling,
    supportRateFloor,
  } = runtime;
  const replayRate = clamp(framePlan.playbackRate - 0.10, balancedFlowFloor, comfortRateMax);
  const ratePolicy = resolveAdaptiveControllerRatePolicy({
    live,
    mode: framePlan.mode,
    isSupportLikeMode: framePlan.isSupportLikeMode,
    playbackRate: framePlan.playbackRate,
    replayRate,
    deferPauseUntilSafeBoundary: framePlan.deferPauseUntilSafeBoundary,
    rollingAccuracyLast3,
    reason: pausePlan.reason,
    reasonCodes: pausePlan.reasonCodes,
    extremeSupportRateFloor,
    supportRateFloor,
    supportRateCeiling,
    balancedFlowFloor,
    baselineRate,
    comfortRateMax,
  });

  return {
    finalPlaybackRate: ratePolicy.finalPlaybackRate,
    replayRate: ratePolicy.replayRate,
  };
}

export type AdaptiveDecisionRatePlan = ReturnType<typeof resolveAdaptiveDecisionRatePlan>;
