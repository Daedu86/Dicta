import { clamp } from './adaptiveDictationControllerMath';
import { applyAdaptivePausePolicy, buildAdaptivePacingReasonArtifacts } from './adaptiveDictationControllerReasons';
import type { AdaptiveControllerRuntime } from './adaptiveDictationControllerDecisionPlanTypes';
import type { AdaptiveDecisionFramePlan } from './adaptiveDictationControllerDecisionPlanFrame';

interface ResolveAdaptiveDecisionPausePlanInput {
  runtime: AdaptiveControllerRuntime;
  framePlan: AdaptiveDecisionFramePlan;
}

export function resolveAdaptiveDecisionPausePlan({
  runtime,
  framePlan,
}: ResolveAdaptiveDecisionPausePlanInput) {
  const {
    browserTtsProfile,
    adaptiveComfort,
    history,
    live,
    rollingAccuracyLast3,
  } = runtime;
  const {
    canReplayIndependently,
    deferPauseUntilSafeBoundary,
    flowBlockedAfterRecovery,
    frameState,
    longPhraseSensitive,
    mode,
    phraseOverload,
    progressGap,
    replayWanted,
    semanticCompleteness,
    shouldReplayPhrase,
    stableRecoveryConfirmed,
    supportsPhraseReplay,
  } = framePlan;
  const { reason, reasonCodes } = buildAdaptivePacingReasonArtifacts({
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
  });
  const adaptivePauseResult = applyAdaptivePausePolicy({
    adaptivePause: browserTtsProfile?.adaptivePause,
    history,
    live,
    mode,
    rollingAccuracyLast3,
    progressGap,
    struggleFrames: frameState.struggleFrames,
    pauseAfterPhraseMs: framePlan.pauseAfterPhraseMs,
    reason,
    reasonCodes,
  });
  let pauseAfterPhraseMs = adaptivePauseResult.pauseAfterPhraseMs;
  if (adaptiveComfort) {
    pauseAfterPhraseMs = Math.round(clamp(pauseAfterPhraseMs, adaptiveComfort.pauseRangeMs[0], adaptiveComfort.pauseRangeMs[1]));
    reason.push(`adaptive-playback-comfort-profile:${adaptiveComfort.source}`);
    reasonCodes.push('adaptive-playback-comfort-profile');
  }

  return {
    pauseAfterPhraseMs,
    reason,
    reasonCodes,
  };
}

export type AdaptiveDecisionPausePlan = ReturnType<typeof resolveAdaptiveDecisionPausePlan>;
