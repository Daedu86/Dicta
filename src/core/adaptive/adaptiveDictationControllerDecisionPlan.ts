import type { PacingDecision } from './types';
import { buildAdaptiveDictationDecisionResult } from './adaptiveDictationControllerDecisionResult';
import { buildAdaptiveDecisionFramePlan } from './adaptiveDictationControllerDecisionPlanFrame';
import { resolveAdaptiveDecisionPausePlan } from './adaptiveDictationControllerDecisionPlanPause';
import { resolveAdaptiveDecisionRatePlan } from './adaptiveDictationControllerDecisionPlanRate';
import type { BuildAdaptiveDictationDecisionPlanInput } from './adaptiveDictationControllerDecisionPlanTypes';

export function buildAdaptiveDictationDecisionPlan({
  input,
  state,
  runtime,
  scores,
  initialPlaybackRate,
}: BuildAdaptiveDictationDecisionPlanInput): PacingDecision {
  const framePlan = buildAdaptiveDecisionFramePlan({
    input,
    state,
    runtime,
    playbackRate: initialPlaybackRate,
  });
  const pausePlan = resolveAdaptiveDecisionPausePlan({ runtime, framePlan });
  const ratePlan = resolveAdaptiveDecisionRatePlan({ runtime, framePlan, pausePlan });
  state.setPreviousRate(ratePlan.finalPlaybackRate);

  return buildAdaptiveDictationDecisionResult({
    mode: framePlan.mode,
    playbackRate: ratePlan.finalPlaybackRate,
    pauseAfterPhraseMs: pausePlan.pauseAfterPhraseMs,
    shouldPauseNow: framePlan.shouldPauseNow,
    shouldReplayPhrase: framePlan.shouldReplayPhrase,
    boundaryStrictness: framePlan.boundaryStrictness,
    allowMidPhrasePause: framePlan.allowMidPhrasePause,
    deferPauseUntilSafeBoundary: framePlan.deferPauseUntilSafeBoundary,
    replayRate: ratePlan.replayRate,
    nextPhraseSize: framePlan.nextPhraseSize,
    reason: pausePlan.reason,
    reasonCodes: pausePlan.reasonCodes,
    lagScore: scores.lagScore,
    accuracyScore: scores.accuracyScore,
    hesitationScore: scores.hesitationScore,
    confidenceScore: scores.confidenceScore,
  });
}
