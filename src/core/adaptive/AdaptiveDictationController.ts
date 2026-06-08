import type {
  AdaptivePacingInput,
  PacingDecision,
  PacingMode,
  PhraseSize,
} from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';

const MIN_PLAYBACK_RATE = 0.84;
const MAX_PLAYBACK_RATE = 1.15;
const MAX_RATE_DELTA = 0.05;

const phraseSizeForMode: Record<PacingMode, PhraseSize> = {
  support: 'short',
  balanced: 'medium',
  flow: 'long',
};

const idealPauseByMode: Record<PacingMode, number> = {
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

function chooseMode(input: AdaptivePacingInput): PacingMode {
  const { live, history } = input;
  const sessionAccuracy = live.sessionAccuracy ?? live.accuracy;
  const chunkAccuracy = live.chunkAccuracy ?? sessionAccuracy;
  const rollingAccuracy = live.rollingAccuracyLast3 ?? chunkAccuracy;
  const lag = live.lagSec;
  const correction = live.correctionRate;
  const wpm = live.wpm;

  const longPhrase = live.phraseLengthWords >= 10 || live.phraseLengthChars >= 65 || live.phraseDifficulty >= 0.75;
  const phraseOverload = longPhrase && (rollingAccuracy < 0.88 || lag > 1.5 || correction > 0.08);
  const longPhraseSensitive = history.strugglesWithLongPhrases && live.phraseLengthWords >= 8;

  const goodFlow =
    rollingAccuracy >= 0.94 &&
    lag < 0.7 &&
    wpm >= Math.max(history.averageWpm * 0.95, 0) &&
    !phraseOverload &&
    !longPhraseSensitive;
  const struggling = lag > 2.0 || rollingAccuracy < 0.8 || correction > 0.10 || phraseOverload || longPhraseSensitive;

  if (struggling) {
    return 'support';
  }

  if (goodFlow) {
    return 'flow';
  }

  return 'balanced';
}

export class AdaptiveDictationController {
  private previousRate = 1;
  private struggleFrames = 0;
  private recoveryFrames = 0;
  private supportFrames = 0;
  private balancedFrames = 0;

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
    const userIsStruggling = live.lagSec > 2.0 || rollingAccuracyLast3 < 0.82 || live.correctionRate > 0.12 || phraseOverload || longPhraseSensitive;
    if (userIsStruggling) {
      this.struggleFrames += 1;
      this.recoveryFrames = 0;
    } else {
      this.recoveryFrames += 1;
      this.struggleFrames = 0;
    }
    if (chosenMode === 'support') {
      this.supportFrames += 1;
      this.balancedFrames = 0;
    } else {
      this.balancedFrames += 1;
      this.supportFrames = 0;
    }

    let mode: PacingMode = chosenMode;
    if (
      mode === 'support' &&
      this.supportFrames >= 2 &&
      this.recoveryFrames >= 3 &&
      rollingAccuracyLast5 > 0.92 &&
      Math.abs(live.lagSec) < 1.5
    ) {
      mode = 'balanced';
    }

    const boundaryStrictness: 'sentence' | 'clause' | 'phrase' = mode === 'support' ? 'clause' : mode === 'flow' ? 'phrase' : 'sentence';
    const allowMidPhrasePause = mode === 'support' && boundaryType === 'minor';

    const hysteresisStruggling = userIsStruggling || this.struggleFrames >= 2;
    const shouldPauseNow = hysteresisStruggling && canPauseAfter;
    const deferPauseUntilSafeBoundary = userIsStruggling && !canPauseAfter;
    const replayWanted = live.lagSec > 2.5 && rollingAccuracyLast3 < 0.82 && canReplayIndependently && semanticCompleteness >= 0.65;
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
      pauseAfterPhraseMs = Math.max(pauseAfterPhraseMs, idealPauseByMode.support);
    }

    // Gradual recovery: require multiple good frames before allowing aggressive growth.
    if (this.recoveryFrames < 3 && nextPhraseSize === 'long') {
      nextPhraseSize = 'medium';
    }

    const replayRate = clamp(playbackRate - 0.10, balancedFlowFloor, MAX_PLAYBACK_RATE);

    const reason = [`mode=${mode}`];
    if (phraseOverload) {
      reason.push('phrase-overload');
    }
    if (longPhraseSensitive) {
      reason.push('long-phrase-sensitive');
    }
    if (shouldReplayPhrase) {
      reason.push('replay-due-to-lag-or-error');
    } else if (!supportsPhraseReplay && replayWanted) {
      reason.push('replay-disabled-recovery');
    } else if (live.lagSec > 2.5 && rollingAccuracyLast3 < 0.82 && !canReplayIndependently) {
      reason.push('replay-blocked-boundary');
    } else if (live.lagSec > 2.5 && rollingAccuracyLast3 < 0.82 && semanticCompleteness < 0.65) {
      reason.push('replay-blocked-incomplete-phrase');
    }
    if (deferPauseUntilSafeBoundary) {
      reason.push('defer-pause-until-safe-boundary');
    }
    if (mode === 'flow') {
      reason.push('high-accuracy-low-lag');
    }
    if (mode === 'support') {
      reason.push('support-needed');
    }
    if (history.sessionsCount < 3) {
      reason.push('low-history-confidence');
    }

    const adaptivePause = browserTtsProfile?.adaptivePause;
    if (adaptivePause?.enabled) {
      const progressGap = Math.max(0, live.spokenProgressRatio - live.typedProgressRatio);
      const historicalPressure = history.averageAccuracy < adaptivePause.historyLowAccuracyThreshold || Math.abs(history.averageLagSec) > adaptivePause.historyHighLagSec;
      const catchUpTargets: number[] = [pauseAfterPhraseMs];

      if (rollingAccuracyLast3 < adaptivePause.veryLowAccuracyThreshold) {
        catchUpTargets.push(adaptivePause.veryLowAccuracyPauseMs);
        reason.push('adaptive-pause-very-low-accuracy');
      } else if (rollingAccuracyLast3 < adaptivePause.lowAccuracyThreshold) {
        catchUpTargets.push(adaptivePause.lowAccuracyPauseMs);
        reason.push('adaptive-pause-low-accuracy');
      }
      if (live.lagSec > adaptivePause.severeLagBehindSec) {
        catchUpTargets.push(adaptivePause.severeLagBehindPauseMs);
        reason.push('adaptive-pause-severe-lag');
      } else if (live.lagSec > adaptivePause.lagBehindSec) {
        catchUpTargets.push(adaptivePause.lagBehindPauseMs);
        reason.push('adaptive-pause-lag');
      }
      if (progressGap > adaptivePause.progressBehindRatio) {
        catchUpTargets.push(adaptivePause.progressBehindPauseMs);
        reason.push('adaptive-pause-progress-gap');
      }
      if (historicalPressure && mode !== 'flow') {
        catchUpTargets.push(adaptivePause.lowAccuracyPauseMs);
        reason.push('adaptive-pause-history-pressure');
      }
      if (this.struggleFrames >= 2) {
        catchUpTargets.push(adaptivePause.lowAccuracyPauseMs);
        reason.push('adaptive-pause-session-pressure');
      }

      const adaptivePauseMs = Math.max(...catchUpTargets);
      pauseAfterPhraseMs = Math.round(clamp(adaptivePauseMs, adaptivePause.minPauseMs, adaptivePause.maxPauseMs));
    }

    const extremeSupport = mode === 'support' && live.lagSec > 4 && rollingAccuracyLast3 < 0.76;
    const modeFloor =
      mode === 'support'
        ? (extremeSupport ? extremeSupportRateFloor : supportRateFloor)
        : balancedFlowFloor;
    playbackRate = Number(Math.max(modeFloor, playbackRate).toFixed(2));
    if (mode === 'support' && reason.includes('support-needed')) {
      playbackRate = Number(Math.min(supportRateCeiling, playbackRate).toFixed(2));
    }

    return {
      mode,
      playbackRate: deferPauseUntilSafeBoundary
        ? Number(Math.max(modeFloor, Number((playbackRate - 0.04).toFixed(2))).toFixed(2))
        : playbackRate,
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
      lagScore,
      accuracyScore,
      hesitationScore,
      confidenceScore,
    };
  }
}
