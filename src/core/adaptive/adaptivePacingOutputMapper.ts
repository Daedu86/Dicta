import type { HistoricalPerformanceProfile, PhraseSize } from './types';
import type {
  AdaptiveListeningState,
  AdaptivePacingOutput,
  LanguageAdaptiveCalibration,
  NormalizedRuntimeTelemetry,
} from './continuousAdaptiveListeningTypes';

export function mapAdaptiveStateToPacingOutput({
  state,
  telemetry,
  history,
  calibration,
}: {
  state: AdaptiveListeningState;
  telemetry: NormalizedRuntimeTelemetry;
  history: HistoricalPerformanceProfile;
  calibration: LanguageAdaptiveCalibration;
}): AdaptivePacingOutput {
  const pressure = state.pressure;
  const currentRate = telemetry.actualPlaybackRate ?? telemetry.currentPlaybackRate;
  const preferredRate = firstFinite([
    history.comfortablePlaybackRate,
    currentRate,
    averageTuple([calibration.playbackRateFloor, calibration.playbackRateCeiling]),
  ]);
  const ratePressure = Math.max(
    pressure.lag,
    pressure.accuracy,
    pressure.reconstruction * 1.6,
    pressure.environment,
    pressure.traceQuality * 0.4,
  );
  const challengeRateLift = (state.adaptiveLevel - 0.5) * 0.22;
  const pressureRateDrop = ratePressure * 0.26;
  const playbackRateTarget = roundRate(clamp(
    preferredRate + challengeRateLift - pressureRateDrop,
    calibration.playbackRateFloor,
    calibration.playbackRateCeiling,
  ));

  const independentPausePressure = Math.max(
    pressure.perceptualPause,
    pressure.boundary * 0.75,
    pressure.semanticLoad * 0.55,
    pressure.lag * 0.62,
    pressure.reconstruction * 0.4,
  );
  const neutralPause = interpolation(calibration.minPerceptualPauseMs, calibration.pauseMsFloor, state.adaptiveLevel);
  const perceptualPauseFloor = pressure.perceptualPause >= 0.25
    ? calibration.minPerceptualPauseMs
    : neutralPause;
  const pauseMsTarget = Math.round(clamp(
    Math.max(neutralPause, perceptualPauseFloor) +
      independentPausePressure * 1550 +
      pressure.currentSession * 350 +
      pressure.history * 250,
    calibration.pauseMsFloor,
    calibration.pauseMsCeiling,
  ));
  const phraseSizeTarget = mapPhraseSizeTarget(state, pressure);
  const boundaryStrictness = round2(clamp01(
    1 - state.adaptiveLevel * 0.55 +
      pressure.boundary * 0.45 +
      pressure.semanticLoad * 0.28 +
      calibration.boundaryStrictnessBias,
  ));
  const replaySupport = round2(clamp01(
    pressure.lag * 0.34 +
      pressure.reconstruction * 0.34 +
      pressure.boundary * 0.16 +
      pressure.traceQuality * 0.16,
  ));

  return {
    playbackRateTarget,
    pauseMsTarget,
    phraseSizeTarget,
    boundaryStrictness,
    replaySupport,
    perceptualPauseLevel: round2(pressure.perceptualPause),
    perceptualRateLevel: round2(ratePressure),
    targetWpmRange: calibration.comfortableWpmRange,
  };
}

export function mapOutputPhraseSizeToLegacyPhraseSize(value: AdaptivePacingOutput['phraseSizeTarget']): PhraseSize {
  return value === 'micro' ? 'short' : value;
}

export function mapBoundaryStrictnessToLegacy(value: number): 'sentence' | 'clause' | 'phrase' {
  if (value >= 0.72) return 'sentence';
  if (value >= 0.38) return 'clause';
  return 'phrase';
}

function mapPhraseSizeTarget(
  state: AdaptiveListeningState,
  pressure: AdaptiveListeningState['pressure'],
): AdaptivePacingOutput['phraseSizeTarget'] {
  const maxPressure = Math.max(
    pressure.accuracy,
    pressure.lag,
    pressure.boundary,
    pressure.semanticLoad,
    pressure.reconstruction,
  );
  if (maxPressure >= 0.78 || state.adaptiveLevel < 0.22) return 'micro';
  if (maxPressure >= 0.48 || state.adaptiveLevel < 0.48) return 'short';
  if (state.adaptiveLevel >= 0.86 && maxPressure < 0.22) return 'long';
  return 'medium';
}

function interpolation(highProtectionValue: number, highChallengeValue: number, level: number): number {
  const clampedLevel = clamp01(level);
  return highProtectionValue * (1 - clampedLevel) + highChallengeValue * clampedLevel;
}

function averageTuple(value: [number, number]): number {
  return (value[0] + value[1]) / 2;
}

function firstFinite(values: number[]): number {
  const match = values.find((value) => Number.isFinite(value));
  return match ?? 1;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRate(value: number): number {
  return Number(value.toFixed(2));
}
