import type {
  AdaptivePacingInput,
  PacingDecision,
} from './types';
import { clamp } from './adaptiveDictationControllerMath';
import { computeAdaptivePacingScores } from './adaptiveDictationControllerTelemetry';
import {
  buildAdaptiveSessionWarmupDecision,
  resolveAdaptiveSessionChunkIndex,
  shouldForceAdaptiveSessionWarmup,
} from './adaptiveDictationControllerWarmup';
import { transitionAdaptiveControllerFrames } from './adaptiveDictationControllerFrames';
import {
  applyUnsupportedPhraseReplayFallback,
  resolveAdaptivePauseReplayPolicy,
} from './adaptiveDictationControllerPlaybackPolicy';
import { resolveAdaptiveControllerRatePolicy } from './adaptiveDictationControllerRatePolicy';
import { applyAdaptivePausePolicy, buildAdaptivePacingReasonArtifacts } from './adaptiveDictationControllerReasons';
import { AdaptiveDictationControllerState } from './adaptiveDictationControllerState';
import { resolveAdaptiveControllerRuntimeContext } from './adaptiveDictationControllerRuntimeContext';
import { resolveAdaptiveControllerPhraseContext } from './adaptiveDictationControllerPhraseContext';
import { resolveAdaptiveControllerPhraseSize } from './adaptiveDictationControllerPhraseSize';

export class AdaptiveDictationController {
  private readonly state = new AdaptiveDictationControllerState();

  decide(input: AdaptivePacingInput): PacingDecision {
    const runtime = resolveAdaptiveControllerRuntimeContext(input, this.state.getPreviousRate());
    const {
      live,
      history,
      browserTtsProfile,
      adaptiveComfort,
      comfortRateMax,
      supportRateFloor,
      extremeSupportRateFloor,
      supportRateCeiling,
      balancedFlowFloor,
      rollingAccuracyLast3,
      rollingAccuracyLast5,
      supportsPhraseReplay,
      chosenMode,
      baselineRate,
    } = runtime;
    let playbackRate = runtime.playbackRate;
    this.state.setPreviousRate(playbackRate);

    const scores = computeAdaptivePacingScores({ live, history, rollingAccuracyLast3 });
    const { lagScore, accuracyScore, hesitationScore, confidenceScore } = scores;

    const sessionWarmup = browserTtsProfile?.sessionWarmup;
    const sessionChunkIndex = resolveAdaptiveSessionChunkIndex(live.sessionChunkIndex);

    if (sessionWarmup && shouldForceAdaptiveSessionWarmup({ sessionWarmup, sessionChunkIndex })) {
      const warmupDecision = buildAdaptiveSessionWarmupDecision({
        sessionWarmup,
        extremeSupportRateFloor,
        supportRateCeiling,
        scores,
      });

      this.state.applyWarmupSupportFrame(warmupDecision.playbackRate);

      return warmupDecision;
    }

    const {
      canReplayIndependently,
      semanticCompleteness,
      phraseOverload,
      longPhraseSensitive,
    } = resolveAdaptiveControllerPhraseContext(live, history, rollingAccuracyLast3);
    const frameTransition = transitionAdaptiveControllerFrames({
      live,
      rollingAccuracyLast3,
      rollingAccuracyLast5,
      chosenMode,
      phraseOverload,
      longPhraseSensitive,
      frameState: this.state.getFrameState(),
    });
    this.state.applyFrameState(frameTransition.frameState);
    const frameState = frameTransition.frameState;

    const {
      mode,
      progressGap,
      userIsStruggling,
      flowBlockedAfterRecovery,
      stableRecoveryConfirmed,
    } = frameTransition;

    const {
      isSupportLikeMode,
      boundaryStrictness,
      allowMidPhrasePause,
      shouldPauseNow,
      deferPauseUntilSafeBoundary,
      replayWanted,
      shouldReplayPhrase,
      pauseAfterPhraseMs: initialPauseAfterPhraseMs,
    } = resolveAdaptivePauseReplayPolicy({
      mode,
      live,
      rollingAccuracyLast3,
      userIsStruggling,
      struggleFrames: frameState.struggleFrames,
      supportsPhraseReplay,
      adaptiveComfort,
    });
    let pauseAfterPhraseMs = initialPauseAfterPhraseMs;

    let nextPhraseSize = resolveAdaptiveControllerPhraseSize({
      mode,
      input,
      phraseOverload,
      longPhraseSensitive,
      semanticCompleteness,
      rollingAccuracyLast3,
      recoveryFrames: frameState.recoveryFrames,
      flowLockFrames: frameState.flowLockFrames,
    });

    const replayFallback = applyUnsupportedPhraseReplayFallback({
      supportsPhraseReplay,
      replayWanted,
      nextPhraseSize,
      playbackRate,
      pauseAfterPhraseMs,
      supportRateFloor,
      adaptiveComfort,
    });
    nextPhraseSize = replayFallback.nextPhraseSize;
    playbackRate = replayFallback.playbackRate;
    pauseAfterPhraseMs = replayFallback.pauseAfterPhraseMs;

    let replayRate = clamp(playbackRate - 0.10, balancedFlowFloor, comfortRateMax);

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
      pauseAfterPhraseMs,
      reason,
      reasonCodes,
    });
    pauseAfterPhraseMs = adaptivePauseResult.pauseAfterPhraseMs;
    if (adaptiveComfort) {
      pauseAfterPhraseMs = Math.round(clamp(pauseAfterPhraseMs, adaptiveComfort.pauseRangeMs[0], adaptiveComfort.pauseRangeMs[1]));
      reason.push(`adaptive-playback-comfort-profile:${adaptiveComfort.source}`);
      reasonCodes.push('adaptive-playback-comfort-profile');
    }

    const ratePolicy = resolveAdaptiveControllerRatePolicy({
      live,
      mode,
      isSupportLikeMode,
      playbackRate,
      replayRate,
      deferPauseUntilSafeBoundary,
      rollingAccuracyLast3,
      reason,
      reasonCodes,
      extremeSupportRateFloor,
      supportRateFloor,
      supportRateCeiling,
      balancedFlowFloor,
      baselineRate,
      comfortRateMax,
    });

    const finalPlaybackRate = ratePolicy.finalPlaybackRate;
    replayRate = ratePolicy.replayRate;
    this.state.setPreviousRate(finalPlaybackRate);

    return {
      mode,
      playbackRate: finalPlaybackRate,
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
}
