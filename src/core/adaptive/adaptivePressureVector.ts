import type { HistoricalPerformanceProfile, ListeningPrecisionMetrics } from './types';
import type {
  AdaptivePressureVector,
  LanguageAdaptiveCalibration,
  NormalizedRuntimeTelemetry,
  RuntimeSampleQuality,
} from './continuousAdaptiveListeningTypes';

export function buildAdaptivePressureVector({
  telemetry,
  history,
  sampleQuality,
  calibration,
}: {
  telemetry: NormalizedRuntimeTelemetry;
  history: HistoricalPerformanceProfile;
  sampleQuality: RuntimeSampleQuality;
  calibration: LanguageAdaptiveCalibration;
}): AdaptivePressureVector {
  const accuracy = computeAccuracyPressure(telemetry);
  const lag = computeLagPressure(telemetry, calibration);
  const correction = clamp01(Math.max(telemetry.correctionRate / 0.18, telemetry.backspaceRate / 0.2));
  const boundary = computeBoundaryPressure(telemetry, calibration);
  const semanticLoad = computeSemanticLoadPressure(telemetry, calibration);
  const reconstruction = computeReconstructionPressure(telemetry.listeningPrecision, accuracy, semanticLoad);
  const typing = computeTypingPressure(telemetry, calibration);
  const environment = computeEnvironmentPressure(telemetry, calibration);
  const historyPressure = computeHistoryPressure(history, calibration);
  const currentSession = clamp01(Math.max(telemetry.progressGap / 0.24, lag * 0.55, accuracy * 0.45));
  const perceptualPause = computePerceptualPausePressure(telemetry, calibration, boundary, semanticLoad);
  const traceQuality = clamp01(1 - sampleQuality.confidenceWeight);

  return {
    accuracy: round2(accuracy),
    lag: round2(lag),
    correction: round2(correction),
    boundary: round2(boundary),
    semanticLoad: round2(semanticLoad),
    reconstruction: round2(reconstruction),
    typing: round2(typing),
    environment: round2(environment),
    history: round2(historyPressure),
    currentSession: round2(currentSession),
    perceptualPause: round2(perceptualPause),
    traceQuality: round2(traceQuality),
  };
}

export function computePerceptualPausePressure(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
  boundaryPressure: number,
  semanticLoadPressure: number,
): number {
  const desiredPauseMs = desiredPerceptualPauseMs(telemetry, calibration, boundaryPressure, semanticLoadPressure);
  const observedPauseMs = telemetry.perceptualGapMs;
  const shortfallPressure = observedPauseMs > 0
    ? clamp01((desiredPauseMs - observedPauseMs) / Math.max(700, desiredPauseMs))
    : telemetry.canPauseAfter ? 0.55 : 0.7;
  const requestedShortfallPressure = clamp01(telemetry.pauseShortfallMs / 1400);
  const deferredPressure = telemetry.pauseDeferred ? 0.42 : 0;

  return clamp01(
    Math.max(shortfallPressure, requestedShortfallPressure, deferredPressure) +
      calibration.perceptualPauseBias,
  );
}

export function desiredPerceptualPauseMs(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
  boundaryPressure: number,
  semanticLoadPressure: number,
): number {
  const boundaryBase =
    telemetry.phraseBoundaryType === 'sentence'
      ? 1850
      : telemetry.phraseBoundaryType === 'clause'
        ? 1550
        : telemetry.phraseBoundaryType === 'minor'
          ? 950
          : 1900;
  const loadBoost = Math.round(semanticLoadPressure * 700 + boundaryPressure * 450);
  return Math.round(clamp(boundaryBase + loadBoost, calibration.pauseMsFloor, calibration.pauseMsCeiling));
}

function computeAccuracyPressure(telemetry: NormalizedRuntimeTelemetry): number {
  const effectiveAccuracy = Math.min(telemetry.accuracy, telemetry.chunkAccuracy, telemetry.rollingAccuracyLast3);
  return clamp01((0.94 - effectiveAccuracy) / 0.3);
}

function computeLagPressure(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
): number {
  const lagBehind = Math.max(0, telemetry.lagSec);
  const [soft, hard] = calibration.lagToleranceRange;
  return clamp01((lagBehind - soft) / Math.max(0.1, hard - soft));
}

function computeBoundaryPressure(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
): number {
  const base =
    telemetry.phraseBoundaryType === 'unsafe'
      ? 1
      : telemetry.phraseBoundaryType === 'minor'
        ? 0.58
        : telemetry.phraseBoundaryType === 'clause'
          ? 0.18
          : 0;
  return clamp01(base + (telemetry.pauseDeferred ? 0.24 : 0) + calibration.boundaryStrictnessBias);
}

function computeSemanticLoadPressure(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
): number {
  const completenessPressure = clamp01((0.92 - telemetry.semanticCompleteness) / 0.45);
  const difficultyPressure = clamp01((telemetry.phraseDifficulty - 0.48) / 0.38);
  const syntaxPressure = clamp01((telemetry.syntaxComplexity - 0.55) / 0.35);
  const lengthPressure = clamp01((telemetry.phraseLengthWords - (9 + calibration.phraseLengthBias)) / 9);
  return clamp01(
    completenessPressure * 0.4 +
      difficultyPressure * 0.22 +
      syntaxPressure * 0.18 +
      lengthPressure * 0.2 +
      calibration.semanticLoadBias,
  );
}

function computeReconstructionPressure(
  precision: ListeningPrecisionMetrics | undefined,
  accuracyPressure: number,
  semanticLoadPressure: number,
): number {
  if (!precision) return clamp01(accuracyPressure * 0.72 + semanticLoadPressure * 0.28);
  const recall = firstFinite([
    precision.listeningRecallScore,
    precision.contentWordRecall,
    precision.detailPrecisionScore,
    precision.wordOrderAccuracy,
  ], 1);
  const omission = clamp01(precision.omissionRate ?? 0);
  return clamp01((1 - recall) * 0.58 + omission * 0.24 + accuracyPressure * 0.18);
}

function computeTypingPressure(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
): number {
  const [minWpm] = calibration.comfortableWpmRange;
  const accurateButBehind = telemetry.accuracy >= 0.86 && telemetry.lagSec > calibration.lagToleranceRange[0];
  const lowWpmPressure = telemetry.wpm > 0 ? clamp01((minWpm - telemetry.wpm) / Math.max(1, minWpm)) : 0.2;
  return clamp01((accurateButBehind ? lowWpmPressure : lowWpmPressure * 0.35) + telemetry.correctionRate * 0.4);
}

function computeEnvironmentPressure(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
): number {
  const rate = telemetry.actualPlaybackRate ?? telemetry.currentPlaybackRate;
  const ratePressure = rate > calibration.playbackRateCeiling
    ? clamp01((rate - calibration.playbackRateCeiling) / 0.35)
    : 0;
  const executionPressure = clamp01(1 - telemetry.executionConfidence);
  return clamp01(ratePressure * 0.55 + executionPressure * 0.45);
}

function computeHistoryPressure(
  history: HistoricalPerformanceProfile,
  calibration: LanguageAdaptiveCalibration,
): number {
  const accuracyPressure = clamp01((0.9 - history.averageAccuracy) / 0.3);
  const lagPressure = clamp01((Math.abs(history.averageLagSec) - calibration.lagToleranceRange[0]) / Math.max(0.1, calibration.lagToleranceRange[1] - calibration.lagToleranceRange[0]));
  const correctionPressure = clamp01(history.typicalCorrectionRate / 0.16);
  const confidenceFactor = clamp01(history.profileConfidence);
  return clamp01((accuracyPressure * 0.38 + lagPressure * 0.38 + correctionPressure * 0.24) * confidenceFactor);
}

function firstFinite(values: Array<number | undefined>, fallback: number): number {
  const match = values.find((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return match ?? fallback;
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
