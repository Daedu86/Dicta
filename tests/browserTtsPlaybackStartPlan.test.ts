import { describe, expect, it } from 'vitest';
import type { SemanticPhrase } from '../src/core/adaptive/SemanticPhrasePlanner';
import { buildBrowserTtsPlaybackStartPlan } from '../src/app/browserTtsPlaybackStartPlan';

function phrases(texts: string[]): SemanticPhrase[] {
  let nextStartWordIndex = 0;

  return texts.map((text, index) => {
    const wordCount = text.trim().split(/\\s+/).filter(Boolean).length;
    const startWordIndex = nextStartWordIndex;
    const endWordIndex = startWordIndex + Math.max(0, wordCount - 1);
    nextStartWordIndex += wordCount;

    return {
      id: `phrase-${index}`,
      text,
      startWordIndex,
      endWordIndex,
    };
  });
}

describe('buildBrowserTtsPlaybackStartPlan', () => {
  it('returns empty-source for whitespace text', () => {
    const plan = buildBrowserTtsPlaybackStartPlan({
      ttsText: '   ',
      ttsLanguage: 'de',
      ttsPacingMode: 'balanced',
      startWordIndex: 0,
      buildSemanticPhrasesForCurrentSession: () => [],
    });

    expect(plan).toEqual({ ok: false, reason: 'empty-source' });
  });

  it('clamps negative start to zero and initializes defaults', () => {
    const plan = buildBrowserTtsPlaybackStartPlan({
      ttsText: 'eins zwei drei',
      ttsLanguage: 'de',
      ttsPacingMode: 'balanced',
      startWordIndex: -5,
      buildSemanticPhrasesForCurrentSession: () => phrases(['eins zwei', 'drei']),
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    expect(plan.clampedStartWordIndex).toBe(0);
    expect(plan.chunkIndex).toBe(0);
    expect(plan.macroPhraseIndex).toBe(0);
    expect(plan.macroWordOffset).toBe(0);
    expect(plan.semanticPhraseStartWordIndices).toEqual([0, 2]);
    expect(plan.lastPhraseSize).toBe('medium');
    expect(plan.lastBoundaryStrictness).toBe('sentence');
  });

  it('clamps oversized start to last source word', () => {
    const plan = buildBrowserTtsPlaybackStartPlan({
      ttsText: 'eins zwei drei',
      ttsLanguage: 'de',
      ttsPacingMode: 'balanced',
      startWordIndex: 99,
      buildSemanticPhrasesForCurrentSession: () => phrases(['eins zwei', 'drei']),
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    expect(plan.clampedStartWordIndex).toBe(2);
    expect(plan.chunkIndex).toBe(2);
  });

  it('computes middle macro phrase index and offset', () => {
    const plan = buildBrowserTtsPlaybackStartPlan({
      ttsText: 'eins zwei drei vier fünf',
      ttsLanguage: 'de',
      ttsPacingMode: 'balanced',
      startWordIndex: 3,
      buildSemanticPhrasesForCurrentSession: () => phrases(['eins zwei', 'drei vier fünf']),
    });

    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    expect(plan.semanticPhraseWords).toEqual([
      ['eins', 'zwei'],
      ['drei', 'vier', 'fünf'],
    ]);
    expect(plan.semanticPhraseStartWordIndices).toEqual([0, 2]);
    expect(plan.macroPhraseIndex).toBe(1);
    expect(plan.macroWordOffset).toBe(1);
  });
});
