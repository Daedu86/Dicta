import type { AdaptivePacingInput } from './types';
import { clamp, computeScore } from './adaptiveDictationControllerMath';

export interface ResolvedAdaptivePacingTelemetry {
  sessionAccuracy: number;
  chunkAccuracy: number;
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
}

export interface AdaptivePacingScores {
  lagScore: number;
  accuracyScore: number;
  hesitationScore: number;
  confidenceScore: number;
}

export function resolveAdaptivePacingTelemetry({
  live,
}: AdaptivePacingInput): ResolvedAdaptivePacingTelemetry {
  const sessionAccuracy = live.sessionAccuracy ?? live.accuracy;
  const chunkAccuracy = live.chunkAccuracy ?? sessionAccuracy;
  const rollingAccuracyLast3 = live.rollingAccuracyLast3 ?? chunkAccuracy;
  const rollingAccuracyLast5 = live.rollingAccuracyLast5 ?? rollingAccuracyLast3;

  return {
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
  };
}

export function computeAdaptivePacingScores({
  live,
  history,
  rollingAccuracyLast3,
}: {
  live: AdaptivePacingInput['live'];
  history: AdaptivePacingInput['history'];
  rollingAccuracyLast3: number;
}): AdaptivePacingScores {
  return {
    lagScore: computeScore(2.5 - live.lagSec, 0, 2.5),
    accuracyScore: computeScore(rollingAccuracyLast3, 0.6, 1),
    hesitationScore: computeScore(1 - live.pauseMs / 2000, 0, 1),
    confidenceScore: clamp(history.profileConfidence, 0, 1),
  };
}
