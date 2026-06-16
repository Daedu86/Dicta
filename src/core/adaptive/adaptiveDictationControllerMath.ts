import type { AdaptivePacingInput, PacingMode, PhraseSize } from './types';

export const MIN_PLAYBACK_RATE = 0.6;
export const MAX_PLAYBACK_RATE = 1.15;
const MAX_RATE_DELTA = 0.05;

export const phraseSizeForMode: Record<PacingMode, PhraseSize> = {
  recovery: 'short',
  support: 'short',
  balanced: 'medium',
  flow: 'long',
};

export const idealPauseByMode: Record<PacingMode, number> = {
  recovery: 2200,
  support: 1200,
  balanced: 750,
  flow: 350,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothRate(current: number, target: number, minRate: number): number {
  const delta = clamp(target - current, -MAX_RATE_DELTA, MAX_RATE_DELTA);
  return Number(clamp(current + delta, minRate, MAX_PLAYBACK_RATE).toFixed(2));
}

export function computeScore(value: number, min: number, max: number): number {
  return clamp((value - min) / Math.max(0.01, max - min), 0, 1);
}

export function computeProgressGap(live: AdaptivePacingInput['live']): number {
  const spokenProgress = live.spokenProgressRatio;
  const typedProgress = live.typedProgressRatio;

  // Treat incomplete/default progress telemetry as absent. Several semantic controller
  // paths do not model Browser TTS progress, and a zero typed ratio should not by itself
  // force support/recovery or defer-pause behavior.
  if (!Number.isFinite(spokenProgress) || !Number.isFinite(typedProgress)) {
    return 0;
  }
  if (spokenProgress <= 0 || typedProgress <= 0) {
    return 0;
  }

  return Math.max(0, spokenProgress - typedProgress);
}
