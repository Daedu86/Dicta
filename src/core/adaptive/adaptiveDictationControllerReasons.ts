import type { AdaptivePacingInput, PacingMode, PacingReasonCode } from './types';
import { clamp } from './adaptiveDictationControllerMath';

type AdaptivePausePolicyConfig = {
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

type BuildAdaptivePacingReasonArtifactsArgs = {
  mode: PacingMode;
  history: AdaptivePacingInput['history'];
  live: AdaptivePacingInput['live'];
  phraseOverload: boolean;
  longPhraseSensitive: boolean;
  shouldReplayPhrase: boolean;
  supportsPhraseReplay: boolean;
  replayWanted: boolean;
  canReplayIndependently: boolean;
  semanticCompleteness: number;
  rollingAccuracyLast3: number;
  deferPauseUntilSafeBoundary: boolean;
  flowBlockedAfterRecovery: boolean;
  stableRecoveryConfirmed: boolean;
};

type ApplyAdaptivePausePolicyArgs = {
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

export function buildAdaptivePacingReasonArtifacts({
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
}: BuildAdaptivePacingReasonArtifactsArgs): { reason: string[]; reasonCodes: PacingReasonCode[] } {
  const reason = [`mode=${mode}`];
  const reasonCodes: PacingReasonCode[] = [`mode-${mode}`];
  if (phraseOverload) {
    reason.push('phrase-overload');
    reasonCodes.push('phrase-overload');
  }
  if (longPhraseSensitive) {
    reason.push('long-phrase-sensitive');
    reasonCodes.push('long-phrase-sensitive');
  }
  if (shouldReplayPhrase) {
    reason.push('replay-due-to-lag-or-error');
    reasonCodes.push('replay-due-to-lag-or-error');
  } else if (!supportsPhraseReplay && replayWanted) {
    reason.push('replay-disabled-recovery');
    reasonCodes.push('replay-disabled-recovery');
  } else if (live.lagSec > 2.5 && rollingAccuracyLast3 < 0.82 && !canReplayIndependently) {
    reason.push('replay-blocked-boundary');
    reasonCodes.push('replay-blocked-boundary');
  } else if (live.lagSec > 2.5 && rollingAccuracyLast3 < 0.82 && semanticCompleteness < 0.65) {
    reason.push('replay-blocked-incomplete-phrase');
    reasonCodes.push('replay-blocked-incomplete-phrase');
  }
  if (deferPauseUntilSafeBoundary) {
    reason.push('defer-pause-until-safe-boundary');
    reasonCodes.push('defer-pause-until-safe-boundary');
  }
  if (flowBlockedAfterRecovery) {
    reason.push('flow-blocked-after-recovery');
    reasonCodes.push('flow-blocked-after-recovery');
  }
  if (stableRecoveryConfirmed) {
    reason.push('stable-recovery-confirmed');
    reasonCodes.push('stable-recovery-confirmed');
  }
  if (mode === 'flow') {
    reason.push('high-accuracy-low-lag');
    reasonCodes.push('high-accuracy-low-lag');
  }
  if (mode === 'recovery') {
    reason.push('recovery-needed');
    reason.push('extended-catch-up-window');
    reason.push('support-needed');
    reasonCodes.push('recovery-needed');
    reasonCodes.push('extended-catch-up-window');
    reasonCodes.push('support-needed');
  } else if (mode === 'support') {
    reason.push('support-needed');
    reasonCodes.push('support-needed');
  }
  if (history.sessionsCount < 3) {
    reason.push('low-history-confidence');
    reasonCodes.push('low-history-confidence');
  }

  return { reason, reasonCodes };
}

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
