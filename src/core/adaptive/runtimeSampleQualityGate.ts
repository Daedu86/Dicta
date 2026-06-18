import type { AdaptiveTimelinePoint } from './types';
import type {
  LanguageAdaptiveCalibration,
  NormalizedRuntimeTelemetry,
  RuntimeSampleQuality,
} from './continuousAdaptiveListeningTypes';

const SCORING_EVENTS = new Set<string>([
  'phrase_advance',
  'phrase_completed',
  'rate_change',
  'support_entered',
  'flow_entered',
]);

export function evaluateRuntimeSampleQuality(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
): RuntimeSampleQuality {
  const rejectionReason = getRuntimeSampleRejectionReason(telemetry, calibration);
  const acceptedForBenchmark = rejectionReason === null;
  const usableTiming = telemetry.lagReliability !== 'invalid' && telemetry.timingConfidence >= 0.35;
  const usableSemantic =
    telemetry.phraseBoundaryType !== 'unsafe' &&
    telemetry.semanticCompleteness >= calibration.sessionInsightMinSemanticCompleteness;
  const acceptedForSessionInsight = usableTiming && telemetry.wpm > 0 && usableSemantic && isLearningEvent(telemetry.event);
  const acceptedForTelemetryLearning = acceptedForSessionInsight || (usableTiming && telemetry.semanticConfidence >= 0.4);
  const acceptedForRuntimePressure = telemetry.lagReliability !== 'invalid' || telemetry.boundaryConfidence < 0.6 || telemetry.executionConfidence < 0.7;
  const confidenceWeight = computeConfidenceWeight({
    telemetry,
    acceptedForBenchmark,
    acceptedForSessionInsight,
    acceptedForTelemetryLearning,
  });

  return {
    acceptedForBenchmark,
    acceptedForSessionInsight,
    acceptedForTelemetryLearning,
    acceptedForRuntimePressure,
    rejectionReason: rejectionReason ?? undefined,
    confidenceWeight,
    lagReliability: telemetry.lagReliability,
  };
}

export function isBenchmarkScoringEvent(event: AdaptiveTimelinePoint['event'] | string | undefined): boolean {
  return typeof event !== 'string' || SCORING_EVENTS.has(event);
}

function getRuntimeSampleRejectionReason(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
): string | null {
  if (!hasValidPhrasePosition(telemetry)) return 'stale_tts_progress';
  if (telemetry.lagReliability === 'invalid') return 'lag_invalid';
  if (rawLagIsOutsideReliableRange(telemetry, calibration)) return 'rawLagSec_out_of_range';
  if (telemetry.timingConfidence < 0.55) return 'timing_confidence_low';
  if (telemetry.wpm <= 0) return 'wpm_not_positive_or_placeholder';
  if (telemetry.phraseBoundaryType === 'unsafe') return 'unsafe_phrase_boundary';
  if (telemetry.semanticCompleteness < calibration.benchmarkMinSemanticCompleteness) {
    return 'semantic_completeness_below_threshold';
  }
  if (!isBenchmarkScoringEvent(telemetry.event)) return 'event_not_scoring';
  return null;
}

function rawLagIsOutsideReliableRange(
  telemetry: NormalizedRuntimeTelemetry,
  calibration: LanguageAdaptiveCalibration,
): boolean {
  const rawLagSec = telemetry.rawLagSec;
  if (typeof rawLagSec !== 'number' || !Number.isFinite(rawLagSec)) return false;
  return rawLagSec < calibration.reliableRawLagRange[0] ||
    rawLagSec > calibration.reliableRawLagRange[1] ||
    rawLagSec === -5 ||
    rawLagSec === 5;
}

function computeConfidenceWeight({
  telemetry,
  acceptedForBenchmark,
  acceptedForSessionInsight,
  acceptedForTelemetryLearning,
}: {
  telemetry: NormalizedRuntimeTelemetry;
  acceptedForBenchmark: boolean;
  acceptedForSessionInsight: boolean;
  acceptedForTelemetryLearning: boolean;
}): number {
  const quality =
    telemetry.timingConfidence * 0.34 +
    telemetry.semanticConfidence * 0.22 +
    telemetry.boundaryConfidence * 0.2 +
    telemetry.executionConfidence * 0.14 +
    (telemetry.wpm > 0 ? 0.1 : 0);
  const useWeight = acceptedForBenchmark ? 1 : acceptedForSessionInsight ? 0.72 : acceptedForTelemetryLearning ? 0.48 : 0.25;
  return round2(clamp01(quality * useWeight));
}

function isLearningEvent(event: AdaptiveTimelinePoint['event'] | string | undefined): boolean {
  return event !== 'defer_pause';
}

function hasValidPhrasePosition(telemetry: NormalizedRuntimeTelemetry): boolean {
  return (
    (telemetry.phraseIndex === undefined || (Number.isInteger(telemetry.phraseIndex) && telemetry.phraseIndex >= 0)) &&
    (typeof telemetry.totalSemanticPhrases !== 'number' ||
      telemetry.phraseIndex === undefined ||
      telemetry.phraseIndex < telemetry.totalSemanticPhrases)
  );
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
