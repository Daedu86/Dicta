import type {
  AdaptivePacingInput,
  PacingDecision,
} from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  clamp,
  smoothRate,
} from './adaptiveDictationControllerMath';
import { chooseAdaptivePacingMode } from './adaptiveDictationControllerMode';
import {
  computeAdaptivePacingScores,
  resolveAdaptivePacingTelemetry,
} from './adaptiveDictationControllerTelemetry';
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
import { resolveAdaptiveNextPhraseSize } from './adaptiveDictationControllerPhrase';
import { applyAdaptivePausePolicy, buildAdaptivePacingReasonArtifacts } from './adaptiveDictationControllerReasons';

export class AdaptiveDictationController {
  private previousRate = 1;
  private struggleFrames = 0;
  private recoveryFrames = 0;
  private supportFrames = 0;
  private balancedFrames = 0;
  private catchUpFrames = 0;
  private flowLockFrames = 0;

  decide(input: AdaptivePacingInput): PacingDecision {
    const { live, history } = input;
    const browserTtsProfile = input.live.inputMode === 'browser-tts'
      ? resolveBrowserTtsAdaptiveProfile(input.live.language)
      : null;
    const adaptiveComfort = history.adaptivePlaybackComfortProfile;
    const comfortRateMin = adaptiveComfort?.rateRange[0] ?? MIN_PLAYBACK_RATE;
    const comfortRateMax = adaptiveComfort?.rateRange[1] ?? MAX_PLAYBACK_RATE;
    const supportRateFloor = Math.min(browserTtsProfile?.supportRateFloor ?? 0.82, comfortRateMin);
    const extremeSupportRateFloor = Math.min(browserTtsProfile?.extremeSupportRateFloor ?? 0.78, supportRateFloor);
    const supportRateCeiling = Math.min(browserTtsProfile?.supportRateCeiling ?? 0.92, comfortRateMax);
    const balancedFlowFloor = Math.min(browserTtsProfile?.balancedFlowFloor ?? MIN_PLAYBACK_RATE, comfortRateMin);
    const { rollingAccuracyLast3, rollingAccuracyLast5 } = resolveAdaptivePacingTelemetry(input);
    const supportsPhraseReplay = input.capabilities?.supportsPhraseReplay ?? true;
    const chosenMode = chooseAdaptivePacingMode(input);
    const preferredRate = adaptiveComfort?.preferredRate ?? (history.comfortablePlaybackRate || 1);
    const baselineRate = clamp(preferredRate, comfortRateMin, comfortRateMax);
    const rateBias = (rollingAccuracyLast3 - history.averageAccuracy) * 0.2 - live.lagSec * 0.05;
    const targetRate = clamp(baselineRate + rateBias, comfortRateMin, comfortRateMax);
    let playbackRate = Number(clamp(smoothRate(this.previousRate, targetRate, balancedFlowFloor), balancedFlowFloor, comfortRateMax).toFixed(2));
    this.previousRate = playbackRate;

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

      this.previousRate = warmupDecision.playbackRate;
      this.struggleFrames = Math.max(this.struggleFrames, 1);
      this.recoveryFrames = 0;
      this.supportFrames += 1;
      this.balancedFrames = 0;

      return warmupDecision;
    }

    const canReplayIndependently = live.canReplayIndependently ?? true;
    const semanticCompleteness = live.semanticCompleteness ?? 1;
    const longPhrase = live.phraseLengthWords >= 10 || live.phraseLengthChars >= 65 || live.phraseDifficulty >= 0.75;
    const phraseOverload = longPhrase && (rollingAccuracyLast3 < 0.88 || live.lagSec > 1.5 || live.correctionRate > 0.08);
    const longPhraseSensitive = history.strugglesWithLongPhrases && live.phraseLengthWords >= 8;
    const frameTransition = transitionAdaptiveControllerFrames({
      live,
      rollingAccuracyLast3,
      rollingAccuracyLast5,
      chosenMode,
      phraseOverload,
      longPhraseSensitive,
      frameState: {
        struggleFrames: this.struggleFrames,
        recoveryFrames: this.recoveryFrames,
        supportFrames: this.supportFrames,
        balancedFrames: this.balancedFrames,
        catchUpFrames: this.catchUpFrames,
        flowLockFrames: this.flowLockFrames,
      },
    });

    this.struggleFrames = frameTransition.frameState.struggleFrames;
    this.recoveryFrames = frameTransition.frameState.recoveryFrames;
    this.supportFrames = frameTransition.frameState.supportFrames;
    this.balancedFrames = frameTransition.frameState.balancedFrames;
    this.catchUpFrames = frameTransition.frameState.catchUpFrames;
    this.flowLockFrames = frameTransition.frameState.flowLockFrames;

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
      struggleFrames: this.struggleFrames,
      supportsPhraseReplay,
      adaptiveComfort,
    });
    let pauseAfterPhraseMs = initialPauseAfterPhraseMs;

    let nextPhraseSize = resolveAdaptiveNextPhraseSize({
      mode,
      live,
      history,
      phraseOverload,
      longPhraseSensitive,
      semanticCompleteness,
      rollingAccuracyLast3,
      recoveryFrames: this.recoveryFrames,
      flowLockFrames: this.flowLockFrames,
    });

    if (adaptiveComfort?.preferredPhraseSize === 'short' && mode !== 'flow') {
      nextPhraseSize = 'short';
    } else if (
      adaptiveComfort?.preferredPhraseSize === 'long' &&
      mode === 'flow' &&
      !phraseOverload &&
      !longPhraseSensitive
    ) {
      nextPhraseSize = 'long';
    }

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
      struggleFrames: this.struggleFrames,
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

    playbackRate = ratePolicy.playbackRate;
    const finalPlaybackRate = ratePolicy.finalPlaybackRate;
    replayRate = ratePolicy.replayRate;
    this.previousRate = finalPlaybackRate;

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
