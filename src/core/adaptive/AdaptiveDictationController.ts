import type {
  AdaptivePacingInput,
  PacingDecision,
  PacingMode,
} from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  clamp,
  computeProgressGap,
  computeScore,
  idealPauseByMode,
  smoothRate,
} from './adaptiveDictationControllerMath';
import { chooseAdaptivePacingMode } from './adaptiveDictationControllerMode';
import { resolveListeningPrecisionRateCeiling } from './adaptiveDictationControllerPrecision';
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
    const sessionAccuracy = live.sessionAccuracy ?? live.accuracy;
    const chunkAccuracy = live.chunkAccuracy ?? sessionAccuracy;
    const rollingAccuracyLast3 = live.rollingAccuracyLast3 ?? chunkAccuracy;
    const rollingAccuracyLast5 = live.rollingAccuracyLast5 ?? rollingAccuracyLast3;
    const supportsPhraseReplay = input.capabilities?.supportsPhraseReplay ?? true;
    const chosenMode = chooseAdaptivePacingMode(input);
    const preferredRate = adaptiveComfort?.preferredRate ?? history.comfortablePlaybackRate || 1;
    const baselineRate = clamp(preferredRate, comfortRateMin, comfortRateMax);
    const rateBias = (rollingAccuracyLast3 - history.averageAccuracy) * 0.2 - live.lagSec * 0.05;
    const targetRate = clamp(baselineRate + rateBias, comfortRateMin, comfortRateMax);
    let playbackRate = Number(clamp(smoothRate(this.previousRate, targetRate, balancedFlowFloor), balancedFlowFloor, comfortRateMax).toFixed(2));
    this.previousRate = playbackRate;

    const lagScore = computeScore(2.5 - live.lagSec, 0, 2.5);
    const accuracyScore = computeScore(rollingAccuracyLast3, 0.6, 1);
    const hesitationScore = computeScore(1 - live.pauseMs / 2000, 0, 1);
    const confidenceScore = clamp(history.profileConfidence, 0, 1);

    const sessionWarmup = browserTtsProfile?.sessionWarmup;
    const sessionChunkIndex = typeof live.sessionChunkIndex === 'number' && Number.isFinite(live.sessionChunkIndex)
      ? live.sessionChunkIndex
      : null;
    const shouldForceSessionWarmup = Boolean(
      sessionWarmup?.enabled &&
      sessionChunkIndex !== null &&
      sessionChunkIndex < sessionWarmup.chunkCount,
    );

    if (shouldForceSessionWarmup && sessionWarmup) {
      const warmupRate = Number(clamp(sessionWarmup.playbackRate, extremeSupportRateFloor, supportRateCeiling).toFixed(2));
      this.previousRate = warmupRate;
      this.struggleFrames = Math.max(this.struggleFrames, 1);
      this.recoveryFrames = 0;
      this.supportFrames += 1;
      this.balancedFrames = 0;

      return {
        mode: 'support',
        playbackRate: warmupRate,
        pauseAfterPhraseMs: sessionWarmup.pauseMs,
        shouldPauseNow: true,
        shouldReplayPhrase: false,
        boundaryStrictness: 'clause',
        allowMidPhrasePause: false,
        deferPauseUntilSafeBoundary: false,
        replayRate: Number(clamp(warmupRate - 0.08, extremeSupportRateFloor, supportRateCeiling).toFixed(2)),
        nextPhraseSize: sessionWarmup.phraseSize,
        reason: 'mode=support, session-warmup-calibration, support-needed',
        reasonCodes: ['mode-support', 'session-warmup-calibration', 'support-needed'],
        lagScore,
        accuracyScore,
        hesitationScore,
        confidenceScore,
      };
    }

    const canPauseAfter = live.canPauseAfter ?? true;
    const canReplayIndependently = live.canReplayIndependently ?? true;
    const semanticCompleteness = live.semanticCompleteness ?? 1;
    const boundaryType = live.phraseBoundaryType ?? 'sentence';
    const longPhrase = live.phraseLengthWords >= 10 || live.phraseLengthChars >= 65 || live.phraseDifficulty >= 0.75;
    const phraseOverload = longPhrase && (rollingAccuracyLast3 < 0.88 || live.lagSec > 1.5 || live.correctionRate > 0.08);
    const longPhraseSensitive = history.strugglesWithLongPhrases && live.phraseLengthWords >= 8;
    const progressGap = computeProgressGap(live);
    const userIsStruggling =
      live.lagSec > 2.0 ||
      rollingAccuracyLast3 < 0.82 ||
      live.correctionRate > 0.12 ||
      (live.lagSec > 1.8 && progressGap > 0.18) ||
      phraseOverload ||
      longPhraseSensitive;
    if (userIsStruggling) {
      this.struggleFrames += 1;
      this.recoveryFrames = 0;
    } else {
      this.recoveryFrames += 1;
      this.struggleFrames = 0;
    }
    const catchUpPressure =
      live.lagSec > 3.0 ||
      (live.lagSec > 2.4 && progressGap > 0.1);
    const recoveryPrecisionStable = rollingAccuracyLast3 >= 0.86 && live.correctionRate < 0.12;
    const immediateRecoveryNeeded = catchUpPressure && recoveryPrecisionStable;
    const sustainedRecoveryNeeded =
      this.struggleFrames >= 2 &&
      recoveryPrecisionStable &&
      (live.lagSec > 2.6 || progressGap > 0.14) &&
      (live.lagSec > 1.8 && progressGap > 0.08);

    let mode: PacingMode = immediateRecoveryNeeded || sustainedRecoveryNeeded ? 'recovery' : chosenMode;
    let flowBlockedAfterRecovery = false;
    let stableRecoveryConfirmed = false;

    if (this.flowLockFrames > 0 && mode === 'flow') {
      mode = 'balanced';
      flowBlockedAfterRecovery = true;
    }

    if (mode === 'recovery') {
      this.catchUpFrames += 1;
      this.flowLockFrames = Math.max(this.flowLockFrames, 6);
      this.supportFrames = 0;
      this.balancedFrames = 0;
    } else if (mode === 'support') {
      this.supportFrames += 1;
      this.balancedFrames = 0;
      if (this.flowLockFrames > 0) this.flowLockFrames -= 1;
    } else {
      this.balancedFrames += 1;
      this.supportFrames = 0;
      if (this.flowLockFrames > 0) this.flowLockFrames -= 1;
    }

    if (
      mode === 'recovery' &&
      this.recoveryFrames >= 6 &&
      rollingAccuracyLast5 > 0.9 &&
      Math.abs(live.lagSec) < 1.0 &&
      live.correctionRate < 0.08 &&
      progressGap < 0.06
    ) {
      mode = 'support';
      stableRecoveryConfirmed = true;
    }

    if (
      mode === 'support' &&
      this.supportFrames >= 2 &&
      this.recoveryFrames >= 5 &&
      rollingAccuracyLast5 > 0.93 &&
      Math.abs(live.lagSec) < 1.0 &&
      progressGap < 0.08
    ) {
      mode = 'balanced';
    }

    if (mode !== 'recovery' && this.recoveryFrames >= 6 && this.catchUpFrames > 0) {
      this.catchUpFrames = 0;
    }

    const isSupportLikeMode = mode === 'support' || mode === 'recovery';
    const boundaryStrictness: 'sentence' | 'clause' | 'phrase' = isSupportLikeMode ? 'clause' : mode === 'flow' ? 'phrase' : 'sentence';
    const allowMidPhrasePause = isSupportLikeMode && boundaryType === 'minor';

    const hysteresisStruggling = userIsStruggling || this.struggleFrames >= 2 || mode === 'recovery';
    const shouldPauseNow = hysteresisStruggling && canPauseAfter;
    const deferPauseUntilSafeBoundary = userIsStruggling && !canPauseAfter;
    const lagReplayWanted = live.lagSec > 2.5 && rollingAccuracyLast3 < 0.82 && canReplayIndependently && semanticCompleteness >= 0.65;
    const catchUpReplayWanted = mode === 'recovery' && rollingAccuracyLast3 < 0.86 && canReplayIndependently && semanticCompleteness >= 0.65;
    const replayWanted = lagReplayWanted || catchUpReplayWanted;
    const shouldReplayPhrase = supportsPhraseReplay && replayWanted;
    const comfortPauseForMode = adaptiveComfort?.statePauseMs[mode];
    let pauseAfterPhraseMs = shouldReplayPhrase
      ? Math.max(1200, comfortPauseForMode ?? idealPauseByMode[mode])
      : comfortPauseForMode ?? idealPauseByMode[mode];

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

    // When replay is not supported, convert "replay wanted" into stronger recovery.
    if (!supportsPhraseReplay && replayWanted) {
      nextPhraseSize = 'short';
      const provisional = Number((playbackRate - 0.06).toFixed(2));
      playbackRate = Math.max(supportRateFloor, provisional);
      pauseAfterPhraseMs = Math.max(pauseAfterPhraseMs, adaptiveComfort?.statePauseMs.recovery ?? idealPauseByMode.recovery);
    }

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

    const extremeSupport = isSupportLikeMode && live.lagSec > 4 && rollingAccuracyLast3 < 0.76;
    const modeFloor =
      mode === 'recovery'
        ? extremeSupportRateFloor
        : mode === 'support'
          ? (extremeSupport ? extremeSupportRateFloor : supportRateFloor)
          : balancedFlowFloor;
    const modeCeiling = isSupportLikeMode ? supportRateCeiling : comfortRateMax;
    playbackRate = Number(clamp(playbackRate, modeFloor, modeCeiling).toFixed(2));
    if (isSupportLikeMode && reasonCodes.includes('support-needed')) {
      playbackRate = Number(Math.min(supportRateCeiling, playbackRate).toFixed(2));
    }

    const precisionRateCeiling = resolveListeningPrecisionRateCeiling(live.listeningPrecision, mode, supportRateCeiling);
    if (precisionRateCeiling !== null) {
      const cappedRate = Number(Math.max(modeFloor, Math.min(precisionRateCeiling, playbackRate)).toFixed(2));
      if (cappedRate < playbackRate) {
        playbackRate = cappedRate;
        reason.push('listening-precision-rate-ceiling');
        reasonCodes.push('listening-precision-rate-ceiling');
      }
    }

    const finalPlaybackRate = deferPauseUntilSafeBoundary
      ? Number(Math.max(modeFloor, Number((playbackRate - 0.04).toFixed(2))).toFixed(2))
      : playbackRate;
    replayRate = Number(clamp(Math.min(replayRate, finalPlaybackRate - 0.02), modeFloor, modeCeiling).toFixed(2));
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
