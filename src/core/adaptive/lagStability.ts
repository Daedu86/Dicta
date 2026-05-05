export const STABLE_LAG_MIN_SEC = -5;
export const STABLE_LAG_MAX_SEC = 5;

export type LagStabilitySample = {
  rawLagSec: number;
  stableLagSec: number;
  isOutlier: boolean;
};

export function buildLagStabilitySample(rawLagSec: number): LagStabilitySample {
  const stableLagSec = clamp(rawLagSec, STABLE_LAG_MIN_SEC, STABLE_LAG_MAX_SEC);
  return {
    rawLagSec,
    stableLagSec,
    isOutlier: Math.abs(rawLagSec) > STABLE_LAG_MAX_SEC,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
