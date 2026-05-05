import type { PacingMode } from '../../core/adaptive/types';

const BALANCED_FLOW_RATE_FLOOR = 0.84;
const SUPPORT_RATE_FLOOR = 0.82;
const EXTREME_SUPPORT_RATE_FLOOR = 0.78;

function roundRate(value: number): number {
  return Number(value.toFixed(2));
}

export function applyBrowserTtsRuntimeRateFloor(params: {
  mode: PacingMode;
  requestedRate: number;
  lagSec: number;
  accuracy: number;
}): number {
  const { mode, requestedRate, lagSec, accuracy } = params;
  const extremeSupport = mode === 'support' && lagSec > 4 && accuracy < 0.76;
  const floor =
    mode === 'support'
      ? (extremeSupport ? EXTREME_SUPPORT_RATE_FLOOR : SUPPORT_RATE_FLOOR)
      : BALANCED_FLOW_RATE_FLOOR;
  return roundRate(Math.max(floor, requestedRate));
}

