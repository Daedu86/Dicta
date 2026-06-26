import { describe, expect, it } from 'vitest';
import { applyCompletedChunkPunctuation } from '../src/app/completedChunkPunctuation';
import { evaluateTranscriptAttempt } from '../src/core/evaluation';
import { buildTextTranscript } from '../src/core/textTranscript';

describe('applyCompletedChunkPunctuation', () => {
  it('copies target punctuation onto matched typed words in a completed chunk', () => {
    expect(
      applyCompletedChunkPunctuation({
        targetText: 'Hola, mundo!',
        typedText: 'Hola mundo',
        completedWordCount: 2,
      }),
    ).toBe('Hola, mundo!');
  });

  it('copies Spanish opening and closing punctuation without correcting typed spelling', () => {
    expect(
      applyCompletedChunkPunctuation({
        targetText: '¿Cómo estás?',
        typedText: 'Como estas',
        completedWordCount: 2,
      }),
    ).toBe('¿Como estas?');
  });

  it('does not add punctuation from target words outside the completed boundary', () => {
    expect(
      applyCompletedChunkPunctuation({
        targetText: 'Hola, mundo! Seguimos.',
        typedText: 'Hola mundo Seguimos',
        completedWordCount: 2,
      }),
    ).toBe('Hola, mundo! Seguimos');
  });

  it('leaves unmatched extra words without invented punctuation', () => {
    expect(
      applyCompletedChunkPunctuation({
        targetText: 'Hola, mundo!',
        typedText: 'Hola extra mundo',
        completedWordCount: 2,
      }),
    ).toBe('Hola, extra mundo!');
  });

  it('normalizes existing typed punctuation to the target punctuation', () => {
    expect(
      applyCompletedChunkPunctuation({
        targetText: 'Hola, mundo!',
        typedText: 'Hola. mundo?',
        completedWordCount: 2,
      }),
    ).toBe('Hola, mundo!');
  });

  it('preserves user spacing while replacing punctuation', () => {
    expect(
      applyCompletedChunkPunctuation({
        targetText: 'Hola, mundo!',
        typedText: 'Hola   mundo ',
        completedWordCount: 2,
      }),
    ).toBe('Hola,   mundo! ');
  });
});

describe('punctuation scoring regression', () => {
  it('keeps punctuation out of points and accuracy calculations', () => {
    const transcript = buildTextTranscript('Hola, mundo!');

    const withoutPunctuation = evaluateTranscriptAttempt('Hola mundo', transcript);
    const withPunctuation = evaluateTranscriptAttempt('Hola, mundo!', transcript);

    expect(withoutPunctuation.points).toBe(2);
    expect(withoutPunctuation.accuracy).toBe(100);
    expect(withPunctuation.points).toBe(withoutPunctuation.points);
    expect(withPunctuation.accuracy).toBe(withoutPunctuation.accuracy);
  });
});
