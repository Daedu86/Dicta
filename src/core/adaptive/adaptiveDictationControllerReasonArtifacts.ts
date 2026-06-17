import type { AdaptivePacingInput, PacingMode, PacingReasonCode } from './types';

export type BuildAdaptivePacingReasonArtifactsArgs = {
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
