import { describe, expect, it } from 'vitest';
import { completeBrowserTtsChunk } from '../src/app/browserTtsChunkCompletion';

describe('completeBrowserTtsChunk', () => {
  it('keeps playback inside the current macro phrase when the chunk does not complete it', () => {
    expect(completeBrowserTtsChunk({
      macroPhraseIndex: 2,
      macroWordOffset: 3,
      macroWordsLength: 10,
      chunkStartWordIndex: 20,
      chunkWordCount: 4,
      effectivePauseNow: false,
      pauseAfterPhraseMs: 250,
    })).toEqual({
      completedSourceWords: 24,
      completesMacroPhrase: false,
      nextMacroPhraseIndex: 2,
      nextMacroWordOffset: 7,
      phraseAdvanced: false,
      shouldPauseBeforeNextChunk: false,
      pauseBeforeNextChunkMs: 0,
    });
  });

  it('advances to the next macro phrase when the chunk completes it exactly', () => {
    expect(completeBrowserTtsChunk({
      macroPhraseIndex: 1,
      macroWordOffset: 6,
      macroWordsLength: 10,
      chunkStartWordIndex: 30,
      chunkWordCount: 4,
      effectivePauseNow: false,
      pauseAfterPhraseMs: 500,
    })).toMatchObject({
      completedSourceWords: 34,
      completesMacroPhrase: true,
      nextMacroPhraseIndex: 2,
      nextMacroWordOffset: 0,
      phraseAdvanced: true,
      shouldPauseBeforeNextChunk: false,
      pauseBeforeNextChunkMs: 0,
    });
  });

  it('advances to the next macro phrase when the chunk overshoots the phrase length', () => {
    expect(completeBrowserTtsChunk({
      macroPhraseIndex: 0,
      macroWordOffset: 8,
      macroWordsLength: 10,
      chunkStartWordIndex: 5,
      chunkWordCount: 5,
      effectivePauseNow: false,
      pauseAfterPhraseMs: 300,
    })).toMatchObject({
      completedSourceWords: 10,
      completesMacroPhrase: true,
      nextMacroPhraseIndex: 1,
      nextMacroWordOffset: 0,
      phraseAdvanced: true,
    });
  });

  it('requests a pause before the next chunk when runtime pacing says to pause', () => {
    expect(completeBrowserTtsChunk({
      macroPhraseIndex: 0,
      macroWordOffset: 0,
      macroWordsLength: 5,
      chunkStartWordIndex: 0,
      chunkWordCount: 2,
      effectivePauseNow: true,
      pauseAfterPhraseMs: 750,
    })).toMatchObject({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 750,
    });
  });
});
