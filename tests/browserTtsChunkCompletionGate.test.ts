import { describe, expect, it } from 'vitest';
import { isBrowserTtsChunkTypedWithTolerantMatch } from '../src/app/browserTtsChunkCompletionGate';
import type { Transcript } from '../src/types/dictation';

function transcript(words: string[]): Transcript {
  return {
    words: words.map((word, index) => ({
      word,
      start: index,
      end: index + 0.4,
    })),
  };
}

describe('isBrowserTtsChunkTypedWithTolerantMatch', () => {
  it('completes when the typed text exactly covers the chunk window', () => {
    expect(
      isBrowserTtsChunkTypedWithTolerantMatch({
        typedText: 'We listen carefully',
        transcript: transcript(['We', 'listen', 'carefully', 'then', 'pause']),
        chunk: { startWordIndex: 0, wordCount: 3 },
      }),
    ).toBe(true);
  });

  it('completes with one-character fuzzy word tolerance', () => {
    expect(
      isBrowserTtsChunkTypedWithTolerantMatch({
        typedText: 'First chunk curent words',
        transcript: transcript(['First', 'chunk', 'current', 'words', 'next', 'chunk']),
        chunk: { startWordIndex: 2, wordCount: 2 },
      }),
    ).toBe(true);
  });

  it('does not complete when a chunk word is missing', () => {
    expect(
      isBrowserTtsChunkTypedWithTolerantMatch({
        typedText: 'We listen',
        transcript: transcript(['We', 'listen', 'carefully', 'then', 'pause']),
        chunk: { startWordIndex: 0, wordCount: 3 },
      }),
    ).toBe(false);
  });

  it('does not let neighboring chunk words complete the current chunk', () => {
    expect(
      isBrowserTtsChunkTypedWithTolerantMatch({
        typedText: 'First chunk next chunk',
        transcript: transcript(['First', 'chunk', 'current', 'words', 'next', 'chunk']),
        chunk: { startWordIndex: 2, wordCount: 2 },
      }),
    ).toBe(false);
  });
});
