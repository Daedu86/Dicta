import { describe, expect, it } from 'vitest';
import { applyBrowserTtsUnsafeBoundaryPolicy } from '../src/inputs/browserTts/browserTtsUnsafePolicy';
import { resolveBrowserTtsAdaptiveProfile } from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';

describe('applyBrowserTtsUnsafeBoundaryPolicy', () => {
  const enProfile = resolveBrowserTtsAdaptiveProfile('en');

  it('keeps rate and pause unchanged on safe boundaries', () => {
    const result = applyBrowserTtsUnsafeBoundaryPolicy({
      boundaryType: 'clause',
      requestedRate: 0.9,
      previousRate: 0.88,
      pauseAfterPhraseMs: 750,
      profile: enProfile,
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
      profile: enProfile,
    });
    expect(result.unsafeBoundaryApplied).toBe(true);
    expect(result.playbackRate).toBe(0.84);
    expect(result.pauseAfterPhraseMs).toBe(1200);
  });

  it('uses profile-specific unsafe pause minimum', () => {
    const result = applyBrowserTtsUnsafeBoundaryPolicy({
      boundaryType: 'unsafe',
      requestedRate: 0.9,
      previousRate: 0.84,
      pauseAfterPhraseMs: 700,
      profile: { ...enProfile, unsafeBoundaryMinPauseMs: 1400 },
    });
    expect(result.pauseAfterPhraseMs).toBe(1400);
  });
});
