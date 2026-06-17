import type { AdaptivePacingInput, PacingMode, PacingReasonCode } from './types';
import { clamp } from './adaptiveDictationControllerMath';

export type AdaptivePausePolicyConfig = {
  enabled?: boolean;
  historyLowAccuracyThreshold: number;
  historyHighLagSec: number;
  severeLagBehindPauseMs: number;
  progressBehindPauseMs: number;
  veryLowAccuracyThreshold: number;
  veryLowAccuracyPauseMs: number;
  lowAccuracyThreshold: number;
  lowAccuracyPauseMs: number;
  severeLagBehindSec: number;
  lagBehindSec: number;
  lagBehindPauseMs: number;
  progressBehindRatio: number;
  minPauseMs: number;
  maxPauseMs: number;
};

export type ApplyAdaptivePausePolicyArgs = {
  adaptivePause: AdaptivePausePolicyConfig | undefined;
  history: AdaptivePacingInput['history'];
  live: AdaptivePacingInput['live'];
  mode: PacingMode;
  rollingAccuracyLast3: number;
  progressGap: number;
  struggleFrames: number;
  pauseAfterPhraseMs: number;
  reason: string[];
  reasonCodes: PacingReasonCode[];
};

export function applyAdaptivePausePolicy({
  adaptivePause,
  history,
  live,
  mode,
  rollingAccuracyLast3,
  progressGap,
  struggleFrames,
  pauseAfterPhraseMs,
  reason,
  reasonCodes,
}: ApplyAdaptivePausePolicyArgs): { pauseAfterPhraseMs: number; reason: string[]; reasonCodes: PacingReasonCode[] } {
  if (!adaptivePause?.enabled) {
    return { pauseAfterPhraseMs, reason, reasonCodes };
  }

  const historicalPressure = history.averageAccuracy < adaptivePause.historyLowAccuracyThreshold || Math.abs(history.averageLagSec) > adaptivePause.historyHighLagSec;
  const catchUpTargets: number[] = [pauseAfterPhraseMs];

  if (mode === 'recovery') {
    catchUpTargets.push(Math.max(adaptivePause.severeLagBehindPauseMs, adaptivePause.progressBehindPauseMs));
  }
  if (rollingAccuracyLast3 < adaptivePause.veryLowAccuracyThreshold) {
    catchUpTargets.push(adaptivePause.veryLowAccuracyPauseMs);
    reason.push('adaptive-pause-very-low-accuracy');
    reasonCodes.push('adaptive-pause-very-low-accuracy');
  } else if (rollingAccuracyLast3 < adaptivePause.lowAccuracyThreshold) {
    catchUpTargets.push(adaptivePause.lowAccuracyPauseMs);
    reason.push('adaptive-pause-low-accuracy');
    reasonCodes.push('adaptive-pause-low-accuracy');
  }
  if (live.lagSec > adaptivePause.severeLagBehindSec) {
    catchUpTargets.push(adaptivePause.severeLagBehindPauseMs);
    reason.push('adaptive-pause-severe-lag');
    reasonCodes.push('adaptive-pause-severe-lag');
  } else if (live.lagSec > adaptivePause.lagBehindSec) {
    catchUpTargets.push(adaptivePause.lagBehindPauseMs);
    reason.push('adaptive-pause-lag');
    reasonCodes.push('adaptive-pause-lag');
  }
  if (progressGap > adaptivePause.progressBehindRatio) {
    catchUpTargets.push(adaptivePause.progressBehindPauseMs);
    reason.push('adaptive-pause-progress-gap');
    reasonCodes.push('adaptive-pause-progress-gap');
  }
  if (historicalPressure && mode !== 'flow') {
    catchUpTargets.push(adaptivePause.lowAccuracyPauseMs);
    reason.push('adaptive-pause-history-pressure');
    reasonCodes.push('adaptive-pause-history-pressure');
  }
  if (struggleFrames >= 2) {
    catchUpTargets.push(adaptivePause.lowAccuracyPauseMs);
    reason.push('adaptive-pause-session-pressure');
    reasonCodes.push('adaptive-pause-session-pressure');
  }

  const adaptivePauseMs = Math.max(...catchUpTargets);
  return {
    pauseAfterPhraseMs: Math.round(clamp(adaptivePauseMs, adaptivePause.minPauseMs, adaptivePause.maxPauseMs)),
    reason,
    reasonCodes,
  };
}
