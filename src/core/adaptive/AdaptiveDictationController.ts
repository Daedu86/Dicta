import type {
  AdaptivePacingInput,
  ListeningPrecisionMetrics,
  PacingDecision,
  PacingMode,
  PacingReasonCode,
  PhraseSize,
} from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';

const MIN_PLAYBACK_RATE = 0.84;
const MAX_PLAYBACK_RATE = 1.15;
const MAX_RATE_DELTA = 0.05;

const phraseSizeForMode: Record<PacingMode, PhraseSize> = {
  recovery: 'short',
  support: 'short',
  balanced: 'medium',
  flow: 'long',
};

const idealPauseByMode: Record<PacingMode, number> = {
  recovery: 2200,
  support: 1200,
  balanced: 750,
  flow: 350,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothRate(current: number, target: number, minRate: number): number {
  const delta = clamp(target - current, -MAX_RATE_DELTA, MAX_RATE_DELTA);
  return Number(clamp(current + delta, minRate, MAX_PLAYBACK_RATE).toFixed(2));
}

function computeScore(value: number, min: number, max: number): number {
  return clamp((value - min) / Math.max(0.01, max - min), 0, 1);
}

function computeProgressGap(live: AdaptivePacingInput['live']): number {
  const spokenProgress = live.spokenProgressRatio;
  const typedProgress = live.typedProgressRatio;

  // Treat incomplete/default progress telemetry as absent. Several semantic controller
  // paths do not model Browser TTS progress, and a zero typed ratio should not by itself
  // force support/recovery or defer-pause behavior.
  if (!Number.isFinite(spokenProgress) || !Number.isFinite(typedProgress)) {
    return 0;
  }
  if (spokenProgress <= 0 || typedProgress <= 0) {
    return 0;
  }

  return Math.max(0, spokenProgress - typedProgress);
}

function chooseMode(input: AdaptivePacingInput): PacingMode {
  const { live, history } = input;
  const sessionAccuracy = live.sessionAccuracy ?? live.accuracy;
  const chunkAccuracy = live.chunkAccuracy ?? sessionAccuracy;
  const rollingAccuracy = live.rollingAccuracyLast3 ?? chunkAccuracy;
  const lag = live.lagSec;
  const correction = live.correctionRate;
  const wpm = live.wpm;
  const progressGap = computeProgressGap(live);

  const longPhrase = live.phraseLengthWords >= 10 || live.phraseLengthChars >= 65 || live.phraseDifficulty >= 0.75;
  const phraseOverload = longPhrase && (rollingAccuracy < 0.88 || lag > 1.5 || correction > 0.08);
  const longPhraseSensitive = history.strugglesWithLongPhrases && live.phraseLengthWords >= 8;

  const goodFlow =
    rollingAccuracy >= 0.94 &&
    lag < 0.7 &&
    wpm >= Math.max(history.averageWpm * 0.95, 0) &&
    !phraseOverload &&
    !longPhraseSensitive;
  const catchUpPressure = lag > 3.0 || (lag > 2.4 && progressGap > 0.1);
  const recoveryPrecisionStable = rollingAccuracy >= 0.86 && correction < 0.12;
  const recoveryNeeded = catchUpPressure && recoveryPrecisionStable;
  const struggling =
    lag > 2.0 ||
    rollingAccuracy < 0.8 ||
    correction > 0.10 ||
    (lag > 1.8 && progressGap > 0.18) ||
    phraseOverload ||
    longPhraseSensitive;

  if (recoveryNeeded) {
    return 'recovery';
  }

  if (struggling) {
    return 'support';
  }

  if (goodFlow) {
    return 'flow';
  }

  return 'balanced';
}

function computeListeningPrecisionControlScore(metrics: ListeningPrecisionMetrics): number {
  return clamp(
    metrics.listeningRecallScore * 0.28 +
      metrics.contentWordRecall * 0.23 +
      metrics.detailPrecisionScore * 0.14 +
      metrics.functionWordAccuracy * 0.14 +
      metrics.wordOrderAccuracy * 0.09 +
      metrics.completionWindowScore * 0.12,
    0,
    1,
  );
}

function resolveListeningPrecisionRateCeiling(
  metrics: ListeningPrecisionMetrics | undefined,
  mode: PacingMode,
  supportRateCeiling: number,
): number | null {
  if (!metrics) return null;
  const precisionScore = computeListeningPrecisionControlScore(metrics);
  const severePrecisionRisk =
    precisionScore < 0.78 ||
    metrics.contentWordRecall < 0.75 ||
    metrics.omissionRate > 0.18 ||
    metrics.completionWindowScore < 0.65;
  if (severePrecisionRisk) return mode === 'support' || mode === 'recovery' ? supportRateCeiling : 0.92;

  const unstablePrecisionRisk =
    precisionScore < 0.86 ||
    metrics.detailPrecisionScore < 0.78 ||
    metrics.functionWordAccuracy < 0.78 ||
    metrics.wordOrderAccuracy < 0.8 ||
    metrics.completionWindowScore < 0.8;
  if (unstablePrecisionRisk) return mode === 'flow' ? 0.98 : 0.96;

  const emergingPrecisionRisk =
    precisionScore < 0.92 ||
    metrics.omissionRate > 0.08 ||
    metrics.completionWindowScore < 0.9;
  if (emergingPrecisionRisk) return mode === 'flow' ? 1.02 : 1;

  return null;
}

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
    const supportRateFloor = browserTtsProfile?.supportRateFloor ?? 0.82;
    const extremeSupportRateFloor = browserTtsProfile?.extremeSupportRateFloor ?? 0.78;
    const supportRateCeiling = browserTtsProfile?.supportRateCeiling ?? 0.92;
    const balancedFlowFloor = browserTtsProfile?.balancedFlowFloor ?? MIN_PLAYBACK_RATE;
    const sessionAccuracy = live.sessionAccuracy ?? live.accuracy;
    const chunkAccuracy = live.chunkAccuracy ?? sessionAccuracy;
    const rollingAccuracyLast3 = live.rollingAccuracyLast3 ?? chunkAccuracy;
    const rollingAccuracyLast5 = live.rollingAccuracyLast5 ?? rollingAccuracyLast3;
    const supportsPhraseReplay = input.capabilities?.supportsPhraseReplay ?? true;
    const chosenMode = chooseMode(input);
    const baselineRate = clamp(history.comfortablePlaybackRate || 1, balancedFlowFloor, MAX_PLAYBACK_RATE);
    const rateBias = (rollingAccuracyLast3 - history.averageAccuracy) * 0.2 - live.lagSec * 0.05;
    const targetRate = clamp(baselineRate + rateBias, balancedFlowFloor, MAX_PLAYBACK_RATE);
    let playbackRate = Number(clamp(smoothRate(this.previousRate, targetRate, balancedFlowFloor), balancedFlowFloor, MAX_PLAYBACK_RATE).toFixed(2));
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
    let pauseAfterPhraseMs = shouldReplayPhrase ? Math.max(1200, idealPauseByMode[mode]) : idealPauseByMode[mode];

    let nextPhraseSize = phraseSizeForMode[mode];
    if (phraseOverload || longPhraseSensitive) {
      nextPhraseSize = 'short';
    }
    if (semanticCompleteness < 0.6) {
      nextPhraseSize = 'short';
    } else if (
      rollingAccuracyLast3 > 0.96 &&
      live.lagSec < 0.5 &&
      live.correctionRate < 0.05 &&
      live.phraseDifficulty < 0.5
    ) {
      nextPhraseSize = mode === 'support' ? 'medium' : phraseSizeForMode[mode];
    }

    if (history.preferredPhraseSize === 'short' && nextPhraseSize === 'long') {
      nextPhraseSize = 'medium';
    }

    // When replay is not supported, convert "replay wanted" into stronger recovery.
    if (!supportsPhraseReplay && replayWanted) {
      nextPhraseSize = 'short';
      const provisional = Number((playbackRate - 0.06).toFixed(2));
      playbackRate = Math.max(supportRateFloor, provisional);
      pauseAfterPhraseMs = Math.max(pauseAfterPhraseMs, idealPauseByMode.recovery);
    }

    // Gradual recovery: require a wider stable window before allowing aggressive growth.
    if (mode === 'recovery') {
      nextPhraseSize = 'short';
    } else if ((this.recoveryFrames < 5 || this.flowLockFrames > 0) && nextPhraseSize === 'long') {
      nextPhraseSize = 'medium';
    }

    let replayRate = clamp(playbackRate - 0.10, balancedFlowFloor, MAX_PLAYBACK_RATE);

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

    const adaptivePause = browserTtsProfile?.adaptivePause;
    if (adaptivePause?.enabled) {
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
      if (this.struggleFrames >= 2) {
        catchUpTargets.push(adaptivePause.lowAccuracyPauseMs);
        reason.push('adaptive-pause-session-pressure');
        reasonCodes.push('adaptive-pause-session-pressure');
      }

      const adaptivePauseMs = Math.max(...catchUpTargets);
      pauseAfterPhraseMs = Math.round(clamp(adaptivePauseMs, adaptivePause.minPauseMs, adaptivePause.maxPauseMs));
    }

    const extremeSupport = isSupportLikeMode && live.lagSec > 4 && rollingAccuracyLast3 < 0.76;
    const modeFloor =
      mode === 'recovery'
        ? extremeSupportRateFloor
        : mode === 'support'
          ? (extremeSupport ? extremeSupportRateFloor : supportRateFloor)
          : balancedFlowFloor;
    playbackRate = Number(Math.max(modeFloor, playbackRate).toFixed(2));
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
    replayRate = Number(clamp(Math.min(replayRate, finalPlaybackRate - 0.02), modeFloor, MAX_PLAYBACK_RATE).toFixed(2));
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
