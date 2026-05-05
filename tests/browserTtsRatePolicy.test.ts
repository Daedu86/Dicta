import { describe, expect, it } from 'vitest';
import { applyBrowserTtsRuntimeRateFloor } from '../src/inputs/browserTts/browserTtsRatePolicy';
import { resolveBrowserTtsAdaptiveProfile } from '../src/inputs/browserTts/browserTtsAdaptiveProfiles';

describe('applyBrowserTtsRuntimeRateFloor', () => {
  const enProfile = resolveBrowserTtsAdaptiveProfile('en');
  const deProfile = resolveBrowserTtsAdaptiveProfile('de');

  it('enforces balanced and flow floor at 0.84', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'balanced',
      requestedRate: 0.82,
      lagSec: 1.2,
      accuracy: 0.9,
      profile: enProfile,
    })).toBe(0.84);
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'flow',
      requestedRate: 0.8,
      lagSec: 0.2,
      accuracy: 0.97,
      profile: enProfile,
    })).toBe(0.84);
  });

  it('enforces support floor at 0.82 for normal support', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 0.79,
      lagSec: 2.8,
      accuracy: 0.84,
      profile: enProfile,
    })).toBe(0.82);
  });

  it('enforces extreme support floor at 0.78', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 0.75,
      lagSec: 4.4,
      accuracy: 0.72,
      profile: enProfile,
    })).toBe(0.78);
  });

  it('caps support-needed rate at 0.92', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 1.0,
      lagSec: 2.3,
      accuracy: 0.83,
      supportNeeded: true,
      profile: enProfile,
    })).toBe(0.92);
  });

  it('uses conservative DE profile values', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'balanced',
      requestedRate: 0.8,
      lagSec: 0.4,
      accuracy: 0.95,
      profile: deProfile,
    })).toBe(0.82);
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 1.0,
      lagSec: 2.5,
      accuracy: 0.8,
      supportNeeded: true,
      profile: deProfile,
    })).toBe(0.9);
  });
});
