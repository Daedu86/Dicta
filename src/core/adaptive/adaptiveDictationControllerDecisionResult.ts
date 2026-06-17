import type { PacingDecision, PacingMode, PacingReasonCode, PhraseSize } from './types';

export interface AdaptiveDictationDecisionResultInput {
  mode: PacingMode;
  playbackRate: number;
  pauseAfterPhraseMs: number;
  shouldPauseNow: boolean;
  shouldReplayPhrase: boolean;
  boundaryStrictness: PacingDecision['boundaryStrictness'];
  allowMidPhrasePause: boolean;
  deferPauseUntilSafeBoundary: boolean;
  replayRate: number;
  nextPhraseSize: PhraseSize;
  reason: string[];
  reasonCodes: PacingReasonCode[];
  lagScore: number;
  accuracyScore: number;
  hesitationScore: number;
  confidenceScore: number;
}

export function buildAdaptiveDictationDecisionResult({
  mode,
  playbackRate,
  pauseAfterPhraseMs,
  shouldPauseNow,
  shouldReplayPhrase,
  boundaryStrictness,
  allowMidPhrasePause,
  deferPauseUntilSafeBoundary,
  replayRate,
  nextPhraseSize,
  reason,
  reasonCodes,
  lagScore,
  accuracyScore,
  hesitationScore,
  confidenceScore,
}: AdaptiveDictationDecisionResultInput): PacingDecision {
  return {
    mode,
    playbackRate,
    pauseAfterPhraseMs,
    shouldPauseNow,
    shouldReplayPhrase,
    boundaryStrictness,
    allowMidPhrasePause,
    deferPauseUntilSafeBoundary,
    executionHint: deferPauseUntilSafeBoundary ? 'Wait for a safe semantic boundary before pausing.' : undefined,
    replayRate,
    nextPhraseSize,
    reason: reason.join(', '),
    reasonCodes,
    lagScore,
    accuracyScore,
    hesitationScore,
    confidenceScore,
  };
}
