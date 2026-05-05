import type { PhraseBoundaryType } from '../../core/adaptive/types';

const UNSAFE_BOUNDARY_MIN_PAUSE_MS = 1200;

function roundRate(value: number): number {
  return Number(value.toFixed(2));
}

export function applyBrowserTtsUnsafeBoundaryPolicy(params: {
  boundaryType: PhraseBoundaryType | undefined;
  requestedRate: number;
  previousRate: number;
  pauseAfterPhraseMs: number;
}): {
  playbackRate: number;
  pauseAfterPhraseMs: number;
  unsafeBoundaryApplied: boolean;
} {
  const { boundaryType, requestedRate, previousRate, pauseAfterPhraseMs } = params;
  if (boundaryType !== 'unsafe') {
    return {
      playbackRate: roundRate(requestedRate),
      pauseAfterPhraseMs,
      unsafeBoundaryApplied: false,
    };
  }

  // Conservative runtime handling for unsafe boundaries:
  // do not speed up and increase pause buffer.
  return {
    playbackRate: roundRate(Math.min(requestedRate, previousRate)),
    pauseAfterPhraseMs: Math.max(pauseAfterPhraseMs, UNSAFE_BOUNDARY_MIN_PAUSE_MS),
    unsafeBoundaryApplied: true,
  };
}

