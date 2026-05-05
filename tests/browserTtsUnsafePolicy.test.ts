import { describe, expect, it } from 'vitest';
import { applyBrowserTtsUnsafeBoundaryPolicy } from '../src/inputs/browserTts/browserTtsUnsafePolicy';

describe('applyBrowserTtsUnsafeBoundaryPolicy', () => {
  it('keeps rate and pause unchanged on safe boundaries', () => {
    const result = applyBrowserTtsUnsafeBoundaryPolicy({
      boundaryType: 'clause',
      requestedRate: 0.9,
      previousRate: 0.88,
      pauseAfterPhraseMs: 750,
    });
    expect(result.unsafeBoundaryApplied).toBe(false);
    expect(result.playbackRate).toBe(0.9);
    expect(result.pauseAfterPhraseMs).toBe(750);
  });

  it('applies conservative handling on unsafe boundaries', () => {
    const result = applyBrowserTtsUnsafeBoundaryPolicy({
      boundaryType: 'unsafe',
      requestedRate: 0.9,
      previousRate: 0.84,
      pauseAfterPhraseMs: 700,
    });
    expect(result.unsafeBoundaryApplied).toBe(true);
    expect(result.playbackRate).toBe(0.84);
    expect(result.pauseAfterPhraseMs).toBe(1200);
  });
});

