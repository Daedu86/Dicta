import type { AdaptiveSessionFeedback } from './types';

export type FeedbackPressure = {
  isAnyPressure: boolean;
  isRecoveryPressure: boolean;
  reasons: string[];
};

export function assessFeedbackPressure(feedback: AdaptiveSessionFeedback | null): FeedbackPressure {
  if (!feedback) return { isAnyPressure: false, isRecoveryPressure: false, reasons: [] };
  const reasons: string[] = [];
  const issues = feedback.playbackIssues;
  if (feedback.verdict === 'regressed') reasons.push('latest session regressed');
  if (issues.repeatedPhraseCount >= 3 || issues.maxRepeatCountForSinglePhrase >= 3) reasons.push('repeat pressure');
  if (issues.skippedPhraseCount > 0) reasons.push('skipped phrases');
  if (issues.outOfOrderAdvanceCount > 0 || issues.replayAdvancedPhraseCount > 0 || issues.phraseIndexJumpCount > 0) {
    reasons.push('phrase order instability');
  }
  if (feedback.phraseStats.totalPhrases > 0) {
    const completionRatio = feedback.phraseStats.completedPhrases / feedback.phraseStats.totalPhrases;
    if (completionRatio < 0.75) reasons.push('low phrase completion');
  }
  const isRecoveryPressure = reasons.some((reason) =>
    reason === 'latest session regressed' ||
    reason === 'phrase order instability' ||
    reason === 'low phrase completion'
  );
  return {
    isAnyPressure: reasons.length > 0,
    isRecoveryPressure,
    reasons,
  };
}
