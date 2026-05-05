import { describe, expect, it } from 'vitest';
import { buildLagStabilitySample, STABLE_LAG_MAX_SEC, STABLE_LAG_MIN_SEC } from '../src/core/adaptive/lagStability';

describe('lag stability sampling', () => {
  it('clamps extreme negative lag', () => {
    const sample = buildLagStabilitySample(-91.68);
    expect(sample.rawLagSec).toBeCloseTo(-91.68, 2);
    expect(sample.stableLagSec).toBe(STABLE_LAG_MIN_SEC);
    expect(sample.isOutlier).toBe(true);
  });

  it('clamps extreme positive lag', () => {
    const sample = buildLagStabilitySample(24.16);
    expect(sample.rawLagSec).toBeCloseTo(24.16, 2);
    expect(sample.stableLagSec).toBe(STABLE_LAG_MAX_SEC);
    expect(sample.isOutlier).toBe(true);
  });

  it('keeps non-outlier lag unchanged', () => {
    const sample = buildLagStabilitySample(1.35);
    expect(sample.rawLagSec).toBe(1.35);
    expect(sample.stableLagSec).toBe(1.35);
    expect(sample.isOutlier).toBe(false);
  });
});
