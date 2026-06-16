import type { AdaptivePacingInput, PacingDecision, PhraseSize } from './types';
import { idealPauseByMode } from './adaptiveDictationControllerMath';

type AdaptiveComfortProfile = NonNullable<AdaptivePacingInput['history']['adaptivePlaybackComfortProfile']>;

export interface AdaptivePauseReplayPolicy {
  isSupportLikeMode: boolean;
  boundaryStrictness: PacingDecision['boundaryStrictness'];
  allowMidPhrasePause: boolean;
  shouldPauseNow: boolean;
  deferPauseUntilSafeBoundary: boolean;
  lagReplayWanted: boolean;
  catchUpReplayWanted: boolean;
  replayWanted: boolean;
  shouldReplayPhrase: boolean;
  pauseAfterPhraseMs: number;
}

export function resolveAdaptivePauseReplayPolicy({
  mode,
  live,
  rollingAccuracyLast3,
  userIsStruggling,
  struggleFrames,
  supportsPhraseReplay,
  adaptiveComfort,
}: {
  mode: PacingDecision['mode'];
  live: AdaptivePacingInput['live'];
  rollingAccuracyLast3: number;
  userIsStruggling: boolean;
  struggleFrames: number;
  supportsPhraseReplay: boolean;
  adaptiveComfort?: AdaptiveComfortProfile;
}): AdaptivePauseReplayPolicy {
  const canPauseAfter = live.canPauseAfter ?? true;
  const canReplayIndependently = live.canReplayIndependently ?? true;
  const semanticCompleteness = live.semanticCompleteness ?? 1;
  const boundaryType = live.phraseBoundaryType ?? 'sentence';

  const isSupportLikeMode = mode === 'support' || mode === 'recovery';
  const boundaryStrictness: PacingDecision['boundaryStrictness'] = isSupportLikeMode
    ? 'clause'
    : mode === 'flow'
      ? 'phrase'
      : 'sentence';
  const allowMidPhrasePause = isSupportLikeMode && boundaryType === 'minor';

  const hysteresisStruggling = userIsStruggling || struggleFrames >= 2 || mode === 'recovery';
  const shouldPauseNow = hysteresisStruggling && canPauseAfter;
  const deferPauseUntilSafeBoundary = userIsStruggling && !canPauseAfter;

  const lagReplayWanted =
    live.lagSec > 2.5 &&
    rollingAccuracyLast3 < 0.82 &&
    canReplayIndependently &&
    semanticCompleteness >= 0.65;
  const catchUpReplayWanted =
    mode === 'recovery' &&
    rollingAccuracyLast3 < 0.86 &&
    canReplayIndependently &&
    semanticCompleteness >= 0.65;
  const replayWanted = lagReplayWanted || catchUpReplayWanted;
  const shouldReplayPhrase = supportsPhraseReplay && replayWanted;
  const comfortPauseForMode = adaptiveComfort?.statePauseMs[mode];
  const pauseAfterPhraseMs = shouldReplayPhrase
    ? Math.max(1200, comfortPauseForMode ?? idealPauseByMode[mode])
    : comfortPauseForMode ?? idealPauseByMode[mode];

  return {
    isSupportLikeMode,
    boundaryStrictness,
    allowMidPhrasePause,
    shouldPauseNow,
    deferPauseUntilSafeBoundary,
    lagReplayWanted,
    catchUpReplayWanted,
    replayWanted,
    shouldReplayPhrase,
    pauseAfterPhraseMs,
  };
}

export function applyUnsupportedPhraseReplayFallback({
  supportsPhraseReplay,
  replayWanted,
  nextPhraseSize,
  playbackRate,
  pauseAfterPhraseMs,
  supportRateFloor,
  adaptiveComfort,
}: {
  supportsPhraseReplay: boolean;
  replayWanted: boolean;
  nextPhraseSize: PhraseSize;
  playbackRate: number;
  pauseAfterPhraseMs: number;
  supportRateFloor: number;
  adaptiveComfort?: AdaptiveComfortProfile;
}): {
  nextPhraseSize: PhraseSize;
  playbackRate: number;
  pauseAfterPhraseMs: number;
} {
  if (supportsPhraseReplay || !replayWanted) {
    return {
      nextPhraseSize,
      playbackRate,
      pauseAfterPhraseMs,
    };
  }

  const provisionalPlaybackRate = Number((playbackRate - 0.06).toFixed(2));

  return {
    nextPhraseSize: 'short',
    playbackRate: Math.max(supportRateFloor, provisionalPlaybackRate),
    pauseAfterPhraseMs: Math.max(
      pauseAfterPhraseMs,
      adaptiveComfort?.statePauseMs.recovery ?? idealPauseByMode.recovery,
    ),
  };
}
