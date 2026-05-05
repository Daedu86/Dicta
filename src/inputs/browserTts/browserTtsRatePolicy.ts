import type { PacingMode } from '../../core/adaptive/types';
import type { BrowserTtsAdaptiveProfile } from './browserTtsAdaptiveProfiles';

function roundRate(value: number): number {
  return Number(value.toFixed(2));
}

export function applyBrowserTtsRuntimeRateFloor(params: {
  mode: PacingMode;
  requestedRate: number;
  lagSec: number;
  accuracy: number;
  supportNeeded?: boolean;
  profile: BrowserTtsAdaptiveProfile;
}): number {
  const { mode, requestedRate, lagSec, accuracy, supportNeeded, profile } = params;
  const extremeSupport = mode === 'support' && lagSec > 4 && accuracy < 0.76;
  const floor =
    mode === 'support'
      ? (extremeSupport ? profile.extremeSupportRateFloor : profile.supportRateFloor)
      : profile.balancedFlowFloor;
  let rate = Math.max(floor, requestedRate);
  if (mode === 'support' && supportNeeded) {
    rate = Math.min(profile.supportRateCeiling, rate);
  }
  return roundRate(rate);
}
