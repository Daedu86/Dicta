import type { AdaptivePacingInput, PacingMode, PhraseSize } from './types';
import { resolveAdaptiveNextPhraseSize } from './adaptiveDictationControllerPhrase';

type ResolveAdaptiveControllerPhraseSizeInput = {
  mode: PacingMode;
  input: AdaptivePacingInput;
  phraseOverload: boolean;
  longPhraseSensitive: boolean;
  semanticCompleteness: number;
  rollingAccuracyLast3: number;
  recoveryFrames: number;
  flowLockFrames: number;
};

export function resolveAdaptiveControllerPhraseSize({
  mode,
  input,
  phraseOverload,
  longPhraseSensitive,
  semanticCompleteness,
  rollingAccuracyLast3,
  recoveryFrames,
  flowLockFrames,
}: ResolveAdaptiveControllerPhraseSizeInput): PhraseSize {
  const nextPhraseSize = resolveAdaptiveNextPhraseSize({
    mode,
    live: input.live,
    history: input.history,
    phraseOverload,
    longPhraseSensitive,
    semanticCompleteness,
    rollingAccuracyLast3,
    recoveryFrames,
    flowLockFrames,
  });
  const adaptiveComfort = input.history.adaptivePlaybackComfortProfile;

  if (adaptiveComfort?.preferredPhraseSize === 'short' && mode !== 'flow') {
    return 'short';
  }
  if (adaptiveComfort?.preferredPhraseSize === 'long' && mode === 'flow' && !phraseOverload && !longPhraseSensitive) {
    return 'long';
  }

  return nextPhraseSize;
}
