import type {
  AdaptivePacingInput,
  PacingDecision,
  PacingMode,
  PhraseSize,
} from './types';

const MIN_PLAYBACK_RATE = 0.75;
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

function smoothRate(current: number, target: number): number {
  const delta = clamp(target - current, -MAX_RATE_DELTA, MAX_RATE_DELTA);
  return Number(clamp(current + delta, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE).toFixed(2));
}

function computeScore(value: number, min: number, max: number): number {
  return clamp((value - min) / Math.max(0.01, max - min), 0, 1);
}

function chooseMode(input: AdaptivePacingInput): PacingMode {
  const { live, history } = input;
  const accuracy = live.accuracy;
  const lag = live.lagSec;
  const correction = live.correctionRate;
  const wpm = live.wpm;

  const longPhrase = live.phraseLengthWords >= 10 || live.phraseLengthChars >= 65 || live.phraseDifficulty >= 0.75;
  const phraseOverload = longPhrase && (accuracy < 0.88 || lag > 1.5 || correction > 0.08);
  const longPhraseSensitive = history.strugglesWithLongPhrases && live.phraseLengthWords >= 8;

  const goodFlow =
    accuracy >= 0.94 &&
    lag < 0.7 &&
    wpm >= Math.max(history.averageWpm * 0.95, 0) &&
    !phraseOverload &&
    !longPhraseSensitive;
  const struggling = lag > 2.0 || accuracy < 0.8 || correction > 0.10 || phraseOverload || longPhraseSensitive;

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

  decide(input: AdaptivePacingInput): PacingDecision {
    const { live, history } = input;
    const mode = chooseMode(input);
    const baselineRate = clamp(history.comfortablePlaybackRate || 1, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE);
    const rateBias = (live.accuracy - history.averageAccuracy) * 0.2 - live.lagSec * 0.05;
    const targetRate = clamp(baselineRate + rateBias, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE);
    const playbackRate = smoothRate(this.previousRate, targetRate);
    this.previousRate = playbackRate;

    const lagScore = computeScore(2.5 - live.lagSec, 0, 2.5);
    const accuracyScore = computeScore(live.accuracy, 0.6, 1);
    const hesitationScore = computeScore(1 - live.pauseMs / 2000, 0, 1);
    const confidenceScore = clamp(history.profileConfidence, 0, 1);

    const canPauseAfter = live.canPauseAfter ?? true;
    const canReplayIndependently = live.canReplayIndependently ?? true;
    const semanticCompleteness = live.semanticCompleteness ?? 1;
    const boundaryType = live.phraseBoundaryType ?? 'sentence';
    const boundaryStrictness: 'sentence' | 'clause' | 'phrase' = mode === 'support' ? 'clause' : mode === 'flow' ? 'phrase' : 'sentence';
    const allowMidPhrasePause = mode === 'support' && boundaryType === 'minor';
    const longPhrase = live.phraseLengthWords >= 10 || live.phraseLengthChars >= 65 || live.phraseDifficulty >= 0.75;
    const phraseOverload = longPhrase && (live.accuracy < 0.88 || live.lagSec > 1.5 || live.correctionRate > 0.08);
    const longPhraseSensitive = history.strugglesWithLongPhrases && live.phraseLengthWords >= 8;
    const userIsStruggling = live.lagSec > 2.0 || live.accuracy < 0.82 || live.correctionRate > 0.12 || phraseOverload || longPhraseSensitive;
    const shouldPauseNow = userIsStruggling && canPauseAfter;
    const deferPauseUntilSafeBoundary = userIsStruggling && !canPauseAfter;
    const shouldReplayPhrase = live.lagSec > 2.5 && live.accuracy < 0.82 && canReplayIndependently && semanticCompleteness >= 0.65;
    const pauseAfterPhraseMs = shouldReplayPhrase ? Math.max(1200, idealPauseByMode[mode]) : idealPauseByMode[mode];

    let nextPhraseSize = phraseSizeForMode[mode];
    if (phraseOverload || longPhraseSensitive) {
      nextPhraseSize = 'short';
    }
    if (semanticCompleteness < 0.6) {
      nextPhraseSize = 'short';
    } else if (
      live.accuracy > 0.96 &&
      live.lagSec < 0.5 &&
      live.correctionRate < 0.05 &&
      live.phraseDifficulty < 0.5
    ) {
      nextPhraseSize = mode === 'support' ? 'medium' : phraseSizeForMode[mode];
    }

    if (history.preferredPhraseSize === 'short' && nextPhraseSize === 'long') {
      nextPhraseSize = 'medium';
    }

    const replayRate = clamp(playbackRate - 0.10, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE);

    const reason = [`mode=${mode}`];
    if (phraseOverload) {
      reason.push('phrase-overload');
    }
    if (longPhraseSensitive) {
      reason.push('long-phrase-sensitive');
    }
    if (shouldReplayPhrase) {
      reason.push('replay-due-to-lag-or-error');
    } else if (live.lagSec > 2.5 && live.accuracy < 0.82 && !canReplayIndependently) {
      reason.push('replay-blocked-boundary');
    } else if (live.lagSec > 2.5 && live.accuracy < 0.82 && semanticCompleteness < 0.65) {
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

    return {
      mode,
      playbackRate: deferPauseUntilSafeBoundary ? Math.max(MIN_PLAYBACK_RATE, Number((playbackRate - 0.04).toFixed(2))) : playbackRate,
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
