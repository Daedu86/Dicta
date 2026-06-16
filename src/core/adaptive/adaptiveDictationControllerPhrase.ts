import type { AdaptivePacingInput, PacingMode, PhraseSize } from './types';
import { phraseSizeForMode } from './adaptiveDictationControllerMath';

type ResolveNextPhraseSizeArgs = {
  mode: PacingMode;
  live: AdaptivePacingInput['live'];
  history: AdaptivePacingInput['history'];
  phraseOverload: boolean;
  longPhraseSensitive: boolean;
  semanticCompleteness: number;
  rollingAccuracyLast3: number;
  recoveryFrames: number;
  flowLockFrames: number;
};

export function resolveAdaptiveNextPhraseSize({
  mode,
  live,
  history,
  phraseOverload,
  longPhraseSensitive,
  semanticCompleteness,
  rollingAccuracyLast3,
  recoveryFrames,
  flowLockFrames,
}: ResolveNextPhraseSizeArgs): PhraseSize {
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

  // Gradual recovery: require a wider stable window before allowing aggressive growth.
  if (mode === 'recovery') {
    nextPhraseSize = 'short';
  } else if ((recoveryFrames < 5 || flowLockFrames > 0) && nextPhraseSize === 'long') {
    nextPhraseSize = 'medium';
  }

  return nextPhraseSize;
}
