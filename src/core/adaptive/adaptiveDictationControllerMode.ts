import type { AdaptivePacingInput, PacingMode } from './types';
import { computeProgressGap } from './adaptiveDictationControllerMath';

export function chooseAdaptivePacingMode(input: AdaptivePacingInput): PacingMode {
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
