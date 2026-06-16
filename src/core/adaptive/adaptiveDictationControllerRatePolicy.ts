import type { AdaptivePacingInput, PacingDecision } from './types';
import { clamp } from './adaptiveDictationControllerMath';
import { resolveListeningPrecisionRateCeiling } from './adaptiveDictationControllerPrecision';

export interface AdaptiveControllerRatePolicyResult {
  playbackRate: number;
  finalPlaybackRate: number;
  replayRate: number;
  modeFloor: number;
  modeCeiling: number;
}

export function resolveAdaptiveControllerRatePolicy({
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
}: {
  live: AdaptivePacingInput['live'];
  mode: PacingDecision['mode'];
  isSupportLikeMode: boolean;
  playbackRate: number;
  replayRate: number;
  deferPauseUntilSafeBoundary: boolean;
  rollingAccuracyLast3: number;
  reason: string[];
  reasonCodes: string[];
  extremeSupportRateFloor: number;
  supportRateFloor: number;
  supportRateCeiling: number;
  balancedFlowFloor: number;
  baselineRate: number;
  comfortRateMax: number;
}): AdaptiveControllerRatePolicyResult {
  const extremeSupport = isSupportLikeMode && live.lagSec > 4 && rollingAccuracyLast3 < 0.76;
  const modeFloor =
    mode === 'recovery'
      ? extremeSupportRateFloor
      : mode === 'support'
        ? (extremeSupport ? extremeSupportRateFloor : supportRateFloor)
        : Math.max(balancedFlowFloor, baselineRate);

  const modeCeiling = isSupportLikeMode ? supportRateCeiling : comfortRateMax;

  let adjustedPlaybackRate = Number(clamp(playbackRate, modeFloor, modeCeiling).toFixed(2));

  if (isSupportLikeMode && reasonCodes.includes('support-needed')) {
    adjustedPlaybackRate = Number(Math.min(0.92, supportRateCeiling, adjustedPlaybackRate).toFixed(2));
  }

  const precisionRateCeiling = resolveListeningPrecisionRateCeiling(
    live.listeningPrecision,
    mode,
    supportRateCeiling,
  );

  if (precisionRateCeiling !== null) {
    const precisionRateFloor = isSupportLikeMode ? modeFloor : balancedFlowFloor;
    const cappedRate = Number(
      Math.max(
        precisionRateFloor,
        Math.min(precisionRateCeiling, adjustedPlaybackRate),
      ).toFixed(2),
    );

    if (cappedRate < adjustedPlaybackRate) {
      adjustedPlaybackRate = cappedRate;
      reason.push('listening-precision-rate-ceiling');
      reasonCodes.push('listening-precision-rate-ceiling');
    }
  }

  const finalPlaybackRate = deferPauseUntilSafeBoundary
    ? Number(Math.max(modeFloor, Number((adjustedPlaybackRate - 0.04).toFixed(2))).toFixed(2))
    : adjustedPlaybackRate;

  const finalReplayRate = Number(
    clamp(Math.min(replayRate, finalPlaybackRate - 0.02), modeFloor, modeCeiling).toFixed(2),
  );

  return {
    playbackRate: adjustedPlaybackRate,
    finalPlaybackRate,
    replayRate: finalReplayRate,
    modeFloor,
    modeCeiling,
  };
}
