import type { ControlAction, TtsPacingMode } from '../types/dictation';

export type KokoroPacingProfile = {
  baseRate: number;
  chunkWords: number;
};

export type KokoroLiveSignal = {
  accuracy: number;
  lagSec: number;
  wpm: number;
  trend: 'improving' | 'stable' | 'declining';
  controllerState: ControlAction;
};

export function deriveKokoroPacingMode(liveSignal: KokoroLiveSignal): TtsPacingMode {
  if (liveSignal.wpm <= 0) return 'balanced';
  if (
    liveSignal.controllerState === 'speed_down' ||
    liveSignal.trend === 'declining' ||
    liveSignal.accuracy < 80 ||
    liveSignal.lagSec > 3
  ) {
    return 'slow';
  }
  if (liveSignal.accuracy >= 92 && Math.abs(liveSignal.lagSec) <= 1.5) {
    return 'flow';
  }
  return 'balanced';
}

export function computeKokoroPlaybackRate(
  profile: KokoroPacingProfile,
  currentRate: number,
  liveSignal: KokoroLiveSignal,
  pacingMode: TtsPacingMode,
  manualBias = 0,
): number {
  const accuracyBias = liveSignal.accuracy > 0 && liveSignal.accuracy < 80 ? -0.1 : liveSignal.accuracy >= 92 ? 0.04 : 0;
  const lagBias = liveSignal.lagSec > 3 ? -0.1 : liveSignal.lagSec < -1.5 ? 0.03 : 0;
  const trendBias = liveSignal.trend === 'declining' ? -0.05 : liveSignal.trend === 'improving' ? 0.03 : 0;
  const pacingBias = pacingMode === 'slow' ? -0.06 : pacingMode === 'flow' ? 0.05 : 0;
  const target = clamp(profile.baseRate + accuracyBias + lagBias + trendBias + pacingBias + manualBias, 0.75, 1.15);
  return smoothStep(currentRate, target, 0.05);
}

function smoothStep(current: number, target: number, maxStep: number): number {
  if (Math.abs(target - current) <= maxStep) {
    return Number(target.toFixed(2));
  }
  return Number((current + Math.sign(target - current) * maxStep).toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
