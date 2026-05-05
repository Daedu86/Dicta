import { describe, expect, it } from 'vitest';
import { applyBrowserTtsRuntimeRateFloor } from '../src/inputs/browserTts/browserTtsRatePolicy';

describe('applyBrowserTtsRuntimeRateFloor', () => {
  it('enforces balanced and flow floor at 0.84', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'balanced',
      requestedRate: 0.82,
      lagSec: 1.2,
      accuracy: 0.9,
    })).toBe(0.84);
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'flow',
      requestedRate: 0.8,
      lagSec: 0.2,
      accuracy: 0.97,
    })).toBe(0.84);
  });

  it('enforces support floor at 0.82 for normal support', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 0.79,
      lagSec: 2.8,
      accuracy: 0.84,
    })).toBe(0.82);
  });

  it('enforces extreme support floor at 0.78', () => {
    expect(applyBrowserTtsRuntimeRateFloor({
      mode: 'support',
      requestedRate: 0.75,
      lagSec: 4.4,
      accuracy: 0.72,
    })).toBe(0.78);
  });
});

