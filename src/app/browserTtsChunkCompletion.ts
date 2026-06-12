export type BrowserTtsChunkCompletionInput = {
  macroPhraseIndex: number;
  macroWordOffset: number;
  macroWordsLength: number;
  chunkStartWordIndex: number;
  chunkWordCount: number;
  effectivePauseNow: boolean;
  pauseAfterPhraseMs: number;
};

export type BrowserTtsChunkCompletionResult = {
  completedSourceWords: number;
  completesMacroPhrase: boolean;
  nextMacroPhraseIndex: number;
  nextMacroWordOffset: number;
  phraseAdvanced: boolean;
  shouldPauseBeforeNextChunk: boolean;
  pauseBeforeNextChunkMs: number;
};

export function completeBrowserTtsChunk({
  macroPhraseIndex,
  macroWordOffset,
  macroWordsLength,
  chunkStartWordIndex,
  chunkWordCount,
  effectivePauseNow,
  pauseAfterPhraseMs,
}: BrowserTtsChunkCompletionInput): BrowserTtsChunkCompletionResult {
  const completedSourceWords = chunkStartWordIndex + chunkWordCount;
  const nextMacroWordOffsetBeforeAdvance = macroWordOffset + chunkWordCount;
  const completesMacroPhrase = nextMacroWordOffsetBeforeAdvance >= macroWordsLength;

  return {
    completedSourceWords,
    completesMacroPhrase,
    nextMacroPhraseIndex: completesMacroPhrase ? macroPhraseIndex + 1 : macroPhraseIndex,
    nextMacroWordOffset: completesMacroPhrase ? 0 : nextMacroWordOffsetBeforeAdvance,
    phraseAdvanced: completesMacroPhrase,
    shouldPauseBeforeNextChunk: effectivePauseNow,
    pauseBeforeNextChunkMs: effectivePauseNow ? pauseAfterPhraseMs : 0,
  };
}
