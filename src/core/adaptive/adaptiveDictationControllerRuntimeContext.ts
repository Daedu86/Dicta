import type { AdaptivePacingInput } from './types';
import { resolveBrowserTtsAdaptiveProfile } from '../../inputs/browserTts/browserTtsAdaptiveProfiles';
import {
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  clamp,
  smoothRate,
} from './adaptiveDictationControllerMath';
import { chooseAdaptivePacingMode } from './adaptiveDictationControllerMode';
import { resolveAdaptivePacingTelemetry } from './adaptiveDictationControllerTelemetry';

export function resolveAdaptiveControllerRuntimeContext(
  input: AdaptivePacingInput,
  previousRate: number,
) {
  const { live, history } = input;
  const browserTtsProfile = input.live.inputMode === 'browser-tts'
    ? resolveBrowserTtsAdaptiveProfile(input.live.language)
    : null;
  const adaptiveComfort = history.adaptivePlaybackComfortProfile;
  const comfortRateMin = adaptiveComfort?.rateRange[0] ?? MIN_PLAYBACK_RATE;
  const comfortRateMax = adaptiveComfort?.rateRange[1] ?? MAX_PLAYBACK_RATE;
  const supportRateFloor = Math.min(browserTtsProfile?.supportRateFloor ?? 0.82, comfortRateMin);
  const extremeSupportRateFloor = Math.min(browserTtsProfile?.extremeSupportRateFloor ?? 0.78, supportRateFloor);
  const supportRateCeiling = Math.min(browserTtsProfile?.supportRateCeiling ?? 0.92, comfortRateMax);
  const balancedFlowFloor = Math.min(browserTtsProfile?.balancedFlowFloor ?? MIN_PLAYBACK_RATE, comfortRateMin);
  const { rollingAccuracyLast3, rollingAccuracyLast5 } = resolveAdaptivePacingTelemetry(input);
  const supportsPhraseReplay = input.capabilities?.supportsPhraseReplay ?? true;
  const chosenMode = chooseAdaptivePacingMode(input);
  const preferredRate = adaptiveComfort?.preferredRate ?? (history.comfortablePlaybackRate || 1);
  const baselineRate = clamp(preferredRate, comfortRateMin, comfortRateMax);
  const rateBias = (rollingAccuracyLast3 - history.averageAccuracy) * 0.2 - live.lagSec * 0.05;
  const targetRate = clamp(baselineRate + rateBias, comfortRateMin, comfortRateMax);
  const playbackRate = Number(clamp(
    smoothRate(previousRate, targetRate, balancedFlowFloor),
    balancedFlowFloor,
    comfortRateMax,
  ).toFixed(2));

  return {
    live,
    history,
    browserTtsProfile,
    adaptiveComfort,
    comfortRateMax,
    supportRateFloor,
    extremeSupportRateFloor,
    supportRateCeiling,
    balancedFlowFloor,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    supportsPhraseReplay,
    chosenMode,
    baselineRate,
    playbackRate,
  };
}
