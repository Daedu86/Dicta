import { describe, expect, it } from 'vitest';
import { planBrowserTtsAdaptiveChunk } from '../src/inputs/browserTts/ttsDynamicChunkPlanner';

describe('planBrowserTtsAdaptiveChunk', () => {
  it('returns null when macro offset is at or past the end', () => {
    const chunk = planBrowserTtsAdaptiveChunk({
      macroWords: ['Hello', 'world.'],
      macroWordOffset: 2,
      globalStartWordIndex: 0,
      language: 'en',
      nextPhraseSize: 'short',
      boundaryStrictness: 'phrase',
    });
    expect(chunk).toBeNull();
  });

  it('prefers sentence boundary when strictness is sentence', () => {
    const words = 'We start slowly, then we speed up. Finally we review.'.split(' ');
    const chunk = planBrowserTtsAdaptiveChunk({
      macroWords: words,
      macroWordOffset: 0,
      globalStartWordIndex: 0,
      language: 'en',
      nextPhraseSize: 'medium',
      boundaryStrictness: 'sentence',
    });
    expect(chunk).not.toBeNull();
    expect(chunk?.phraseBoundaryType).toBe('sentence');
    expect(chunk?.text.endsWith('.')).toBe(true);
    expect((chunk?.wordCount ?? 0)).toBeGreaterThan(0);
  });

  it('allows clause boundary when strictness is clause', () => {
    const words = 'First we listen, then we type, and we recover.'.split(' ');
    const chunk = planBrowserTtsAdaptiveChunk({
      macroWords: words,
      macroWordOffset: 0,
      globalStartWordIndex: 0,
      language: 'en',
      nextPhraseSize: 'short',
      boundaryStrictness: 'clause',
    });
    expect(chunk).not.toBeNull();
    expect(['sentence', 'clause']).toContain(chunk?.phraseBoundaryType);
  });

  it('can produce a minor boundary when strictness is phrase', () => {
    const words = 'This is a long phrase without punctuation to force a minor cut'.split(' ');
    const chunk = planBrowserTtsAdaptiveChunk({
      macroWords: words,
      macroWordOffset: 0,
      globalStartWordIndex: 0,
      language: 'en',
      nextPhraseSize: 'short',
      boundaryStrictness: 'phrase',
    });
    expect(chunk).not.toBeNull();
    expect((chunk?.wordCount ?? 0)).toBeGreaterThan(0);
    expect(['sentence', 'clause', 'minor', 'unsafe']).toContain(chunk?.phraseBoundaryType);
  });

  it('never produces an empty chunk in normal cases', () => {
    const words = 'Primero escuchamos, luego escribimos. Al final revisamos.'.split(' ');
    const chunk = planBrowserTtsAdaptiveChunk({
      macroWords: words,
      macroWordOffset: 0,
      globalStartWordIndex: 0,
      language: 'es',
      nextPhraseSize: 'medium',
      boundaryStrictness: 'phrase',
    });
    expect(chunk).not.toBeNull();
    expect((chunk?.wordCount ?? 0)).toBeGreaterThan(0);
    expect((chunk?.text ?? '').trim().length).toBeGreaterThan(0);
  });

  it('sets startWordIndex based on globalStartWordIndex + macroWordOffset', () => {
    const words = 'Zuerst horen wir zu, dann schreiben wir.'.split(' ');
    const chunk = planBrowserTtsAdaptiveChunk({
      macroWords: words,
      macroWordOffset: 3,
      globalStartWordIndex: 10,
      language: 'de',
      nextPhraseSize: 'short',
      boundaryStrictness: 'phrase',
    });
    expect(chunk).not.toBeNull();
    expect(chunk?.startWordIndex).toBe(13);
  });

  it('applies a recovery word cap for German short chunks while keeping safe boundaries', () => {
    const words = 'Wir hoeren den ersten Satz. Danach schreiben wir langsam weiter.'.split(' ');
    const chunk = planBrowserTtsAdaptiveChunk({
      macroWords: words,
      macroWordOffset: 0,
      globalStartWordIndex: 0,
      language: 'de',
      nextPhraseSize: 'short',
      boundaryStrictness: 'phrase',
      germanShortBias: true,
      maxWordsOverride: 4,
    });

    expect(chunk).not.toBeNull();
    expect(chunk?.wordCount).toBeLessThanOrEqual(4);
    expect(chunk?.phraseBoundaryType).not.toBe('unsafe');
  });
});
