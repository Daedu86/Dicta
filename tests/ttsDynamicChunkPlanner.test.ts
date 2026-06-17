import { describe, expect, it } from 'vitest';
import {
  planChunk,
  splitWords,
} from './helpers/ttsDynamicChunkPlannerFixtures';

describe('planBrowserTtsAdaptiveChunk', () => {
  it('returns null when macro offset is at or past the end', () => {
    const chunk = planChunk({
      macroWords: ['Hello', 'world.'],
      macroWordOffset: 2,
    });

    expect(chunk).toBeNull();
  });

  it('prefers sentence boundary when strictness is sentence', () => {
    const chunk = planChunk({
      text: 'We start slowly, then we speed up. Finally we review.',
      nextPhraseSize: 'medium',
      boundaryStrictness: 'sentence',
    });

    expect(chunk).not.toBeNull();
    expect(chunk?.phraseBoundaryType).toBe('sentence');
    expect(chunk?.text.endsWith('.')).toBe(true);
    expect((chunk?.wordCount ?? 0)).toBeGreaterThan(0);
  });

  it('adds V3 prosody metadata for sentence chunks', () => {
    const chunk = planChunk({
      text: 'We listen carefully. Then we type slowly.',
      boundaryStrictness: 'sentence',
    });

    expect(chunk).not.toBeNull();
    expect(chunk?.v3Prosody?.boundaryStrength).toBe('sentence');
    expect(chunk?.v3Prosody?.pauseClass).toBe('sentence');
    expect(chunk?.v3Prosody?.semanticCompletenessClass).toBe('complete');
    expect(chunk?.v3Prosody?.breathGroup.isComplete).toBe(true);
  });

  it('marks fragile V3 chunks that end on an unsafe edge', () => {
    const chunk = planChunk({
      text: 'We wait for the next phrase before typing',
      boundaryStrictness: 'sentence',
      maxWordsOverride: 4,
    });

    expect(chunk).not.toBeNull();
    expect(chunk?.phraseBoundaryType).toBe('unsafe');
    expect(chunk?.v3Prosody?.edgeWordFlag).toBe(true);
    expect(chunk?.v3Prosody?.pauseClass).toBe('none');
    expect(chunk?.v3Prosody?.replayStrategy).toBe('repeat-with-preroll');
  });

  it('uses recovery pause class for German recovery-safe chunks', () => {
    const chunk = planGermanRecoveryChunk({ recoverySafeBoundary: true });

    expect(chunk).not.toBeNull();
    expect(chunk?.v3Prosody?.pauseClass).toBe('recovery');
    expect(chunk?.v3Prosody?.breathGroup.isComplete).toBe(true);
  });

  it('allows clause boundary when strictness is clause', () => {
    const chunk = planChunk({
      text: 'First we listen, then we type, and we recover.',
      boundaryStrictness: 'clause',
    });

    expect(chunk).not.toBeNull();
    expect(['sentence', 'clause']).toContain(chunk?.phraseBoundaryType);
  });

  it('can produce a minor boundary when strictness is phrase', () => {
    const chunk = planChunk({
      text: 'This is a long phrase without punctuation to force a minor cut',
    });

    expect(chunk).not.toBeNull();
    expect((chunk?.wordCount ?? 0)).toBeGreaterThan(0);
    expect(['sentence', 'clause', 'minor', 'unsafe']).toContain(chunk?.phraseBoundaryType);
  });

  it('never produces an empty chunk in normal cases', () => {
    const chunk = planChunk({
      text: 'Primero escuchamos, luego escribimos. Al final revisamos.',
      language: 'es',
      nextPhraseSize: 'medium',
    });

    expect(chunk).not.toBeNull();
    expect((chunk?.wordCount ?? 0)).toBeGreaterThan(0);
    expect((chunk?.text ?? '').trim().length).toBeGreaterThan(0);
  });

  it('plans Portuguese chunks with PT semantic heuristics', () => {
    const chunk = planChunk({
      text: 'Primeiro escutamos, depois escrevemos. No final revisamos com calma.',
      language: 'pt',
      nextPhraseSize: 'medium',
    });

    expect(chunk).not.toBeNull();
    expect((chunk?.wordCount ?? 0)).toBeGreaterThan(0);
    expect((chunk?.semanticCompleteness ?? 0)).toBeGreaterThan(0);
  });

  it('sets startWordIndex based on globalStartWordIndex + macroWordOffset', () => {
    const chunk = planChunk({
      text: 'Zuerst horen wir zu, dann schreiben wir.',
      macroWordOffset: 3,
      globalStartWordIndex: 10,
      language: 'de',
    });

    expect(chunk).not.toBeNull();
    expect(chunk?.startWordIndex).toBe(13);
  });

  it('applies a recovery word cap for German short chunks while keeping safe boundaries', () => {
    const chunk = planGermanRecoveryChunk();

    expect(chunk).not.toBeNull();
    expect(chunk?.wordCount).toBeLessThanOrEqual(4);
    expect(chunk?.phraseBoundaryType).not.toBe('unsafe');
  });

  it('lets German recovery scan past the short cap to reach a safe sentence boundary', () => {
    const chunk = planGermanRecoveryChunk({ recoverySafeBoundary: true });

    expect(chunk).not.toBeNull();
    expect(chunk?.wordCount).toBe(5);
    expect(chunk?.phraseBoundaryType).toBe('sentence');
    expect(chunk?.semanticCompleteness).toBeGreaterThanOrEqual(0.7);
  });

  it('keeps normal German short-cap behavior when recovery-safe scanning is off', () => {
    const chunk = planGermanRecoveryChunk();

    expect(chunk).not.toBeNull();
    expect(chunk?.wordCount).toBeLessThanOrEqual(4);
  });

  it('ignores recovery-safe scanning for non-German languages', () => {
    for (const language of ['en', 'es', 'fr', 'pt'] as const) {
      const chunk = planChunk({
        text: 'We hear the first sentence. Then we continue slowly.',
        language,
        maxWordsOverride: 4,
        recoverySafeBoundary: true,
      });

      expect(chunk).not.toBeNull();
      expect(chunk?.wordCount).toBeLessThanOrEqual(4);
    }
  });
});

function planGermanRecoveryChunk(overrides: { recoverySafeBoundary?: boolean } = {}) {
  return planChunk({
    macroWords: splitWords('Wir hoeren den ersten Satz. Danach schreiben wir langsam weiter.'),
    language: 'de',
    germanShortBias: true,
    maxWordsOverride: 4,
    ...overrides,
  });
}
