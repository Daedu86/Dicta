import type {
  AdaptiveListeningState,
  AdaptivePressureVector,
  DerivedAdaptiveLabel,
  RuntimeSampleQuality,
} from './continuousAdaptiveListeningTypes';

export function buildAdaptiveListeningState({
  pressure,
  sampleQuality,
  previousAdaptiveLevel,
}: {
  pressure: AdaptivePressureVector;
  sampleQuality: RuntimeSampleQuality;
  previousAdaptiveLevel?: number;
}): AdaptiveListeningState {
  const weightedPressure = computeWeightedPressure(pressure);
  const rawLevel = clamp01(1 - weightedPressure);
  const nextLevelWeight = previousAdaptiveLevel === undefined
    ? 1
    : rawLevel > previousAdaptiveLevel
      ? 0.8
      : 0.45;
  const adaptiveLevel = round2(
    previousAdaptiveLevel === undefined
      ? rawLevel
      : previousAdaptiveLevel * (1 - nextLevelWeight) + rawLevel * nextLevelWeight,
  );
  const delta = previousAdaptiveLevel === undefined ? 0 : adaptiveLevel - previousAdaptiveLevel;
  const direction = delta < -0.04 ? 'easing' : delta > 0.04 ? 'challenging' : 'holding';
  const confidence = round2(clamp01(
    sampleQuality.confidenceWeight * 0.58 +
      (1 - pressure.traceQuality) * 0.22 +
      (1 - Math.max(pressure.environment, pressure.boundary) * 0.25) * 0.2,
  ));

  return {
    adaptiveLevel,
    confidence,
    direction,
    pressure,
    reasonCodes: buildContinuousReasonCodes(pressure, sampleQuality, adaptiveLevel),
  };
}

export function deriveAdaptiveLabel(level: number): DerivedAdaptiveLabel {
  if (level < 0.2) return 'legacy-recovery';
  if (level < 0.45) return 'legacy-support';
  if (level < 0.65) return 'legacy-guided';
  if (level < 0.85) return 'legacy-balanced';
  return 'legacy-flow';
}

export function mapAdaptiveLevelToLegacyMode(level: number): 'recovery' | 'support' | 'balanced' | 'flow' {
  if (level < 0.2) return 'recovery';
  if (level < 0.45) return 'support';
  if (level < 0.85) return 'balanced';
  return 'flow';
}

function computeWeightedPressure(pressure: AdaptivePressureVector): number {
  const weightedPressure = clamp01(
    pressure.accuracy * 0.13 +
      pressure.lag * 0.13 +
      pressure.correction * 0.08 +
      pressure.boundary * 0.1 +
      pressure.semanticLoad * 0.1 +
      pressure.reconstruction * 0.12 +
      pressure.typing * 0.06 +
      pressure.environment * 0.08 +
      pressure.history * 0.07 +
      pressure.currentSession * 0.07 +
      pressure.perceptualPause * 0.14 +
      pressure.traceQuality * 0.05,
  );
  const dominantRuntimePressure = Math.max(
    pressure.accuracy,
    pressure.lag,
    pressure.correction,
    pressure.boundary,
    pressure.semanticLoad,
    pressure.reconstruction,
    pressure.typing,
    pressure.environment,
    pressure.history,
    pressure.currentSession,
  );
  return clamp01(weightedPressure * 0.55 + dominantRuntimePressure * 0.45);
}

function buildContinuousReasonCodes(
  pressure: AdaptivePressureVector,
  sampleQuality: RuntimeSampleQuality,
  adaptiveLevel: number,
): string[] {
  const reasonCodes = ['continuous-adaptive-level'];
  if (adaptiveLevel < 0.45) reasonCodes.push('continuous-easing');
  if (adaptiveLevel > 0.85) reasonCodes.push('continuous-challenge-ready');
  if (pressure.perceptualPause >= 0.25) reasonCodes.push('perceptual-pause-pressure');
  if (pressure.lag >= 0.4) reasonCodes.push('lag-pressure');
  if (pressure.accuracy >= 0.4 || pressure.reconstruction >= 0.4) reasonCodes.push('reconstruction-pressure');
  if (pressure.boundary >= 0.35) reasonCodes.push('boundary-pressure');
  if (pressure.semanticLoad >= 0.35) reasonCodes.push('semantic-load-pressure');
  if (pressure.typing >= 0.35) reasonCodes.push('typing-pressure');
  if (pressure.environment >= 0.35) reasonCodes.push('environment-pressure');
  if (!sampleQuality.acceptedForBenchmark) reasonCodes.push('benchmark-sample-gated');
  if (sampleQuality.acceptedForRuntimePressure) reasonCodes.push('runtime-pressure-sample');
  return [...new Set(reasonCodes)];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
