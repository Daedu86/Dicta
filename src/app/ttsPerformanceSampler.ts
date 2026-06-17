import type { TtsPerformanceSampleResult } from './sessionTypes';
import type {
  TtsPerformanceSampleOptions,
  TtsPerformanceSamplerDependencies,
} from './ttsPerformanceSamplerTypes';
import { buildTtsPerformanceMetricSnapshot } from './ttsPerformanceSampleMetrics';
import { updateTtsPerformanceSampleTelemetry } from './ttsPerformanceSampleTelemetry';

export function sampleTtsPerformance(
  {
    ttsStartedAtMsRef,
    ttsPracticeLiveTextRef,
    ttsTranscript,
    ttsSpeechRate,
    ttsLanguage,
    ttsLastValidControlLagSecRef,
    ttsLagOutlierCountRef,
    ttsLiveSignalRef,
    previousLagRef,
    previousAccuracyRef,
    telemetryRef,
    ttsLastControllerActionRef,
    estimateTtsSpokenWordIndex,
    getTtsElapsedSeconds,
    ensureAttemptTelemetry,
    publishTtsUiState,
    nowMs,
    nowIso,
  }: TtsPerformanceSamplerDependencies,
  options: TtsPerformanceSampleOptions = {},
): TtsPerformanceSampleResult {
  const now = nowMs ? nowMs() : performance.now();
  if (ttsStartedAtMsRef.current === null) {
    ttsStartedAtMsRef.current = now;
  }

  const practiceTextForEvaluation = options.practiceTextOverride ?? ttsPracticeLiveTextRef.current;
  const spokenPosition = estimateTtsSpokenWordIndex(now);
  const elapsedSeconds = getTtsElapsedSeconds(now);
  const metricSnapshot = buildTtsPerformanceMetricSnapshot({
    practiceTextForEvaluation,
    ttsTranscript,
    ttsSpeechRate,
    ttsLanguage,
    previousValidControlLagSec: ttsLastValidControlLagSecRef.current,
    previousLagSec: previousLagRef.current,
    previousAccuracy: previousAccuracyRef.current,
    spokenPosition,
    elapsedSeconds,
  });

  if (metricSnapshot.lagSample.isOutlier) {
    ttsLagOutlierCountRef.current += 1;
  }
  if (!metricSnapshot.lagSample.usedFallbackControlLag && Number.isFinite(metricSnapshot.lagSec)) {
    ttsLastValidControlLagSecRef.current = metricSnapshot.lagSec;
  }

  ttsLiveSignalRef.current = {
    accuracy: metricSnapshot.accuracy,
    lagSec: metricSnapshot.lagSec,
    rawLagSec: metricSnapshot.lagSample.rawLagSec,
    stableLagSec: metricSnapshot.lagSample.stableLagSec,
    lagOutlierCount: ttsLagOutlierCountRef.current,
    wpm: metricSnapshot.wpm,
    trend: metricSnapshot.trend,
    controllerState: metricSnapshot.controllerAction,
  };

  publishTtsUiState(
    {
      controllerState: metricSnapshot.controllerAction,
      rate: metricSnapshot.rate,
      lagSec: metricSnapshot.lagSec,
      lagWords: metricSnapshot.lagWords,
      wpm: metricSnapshot.wpm,
      accuracy: metricSnapshot.accuracy,
      trend: metricSnapshot.trend,
    },
    now,
    Boolean(options.forcePublishUi || options.finalize || options.action),
  );
  previousLagRef.current = metricSnapshot.lagSec;
  previousAccuracyRef.current = metricSnapshot.accuracy;

  const telemetryUpdate = updateTtsPerformanceSampleTelemetry({
    telemetry: ensureAttemptTelemetry(),
    snapshot: metricSnapshot,
    elapsedSeconds,
    options,
    previousControllerAction: ttsLastControllerActionRef.current,
    finishedAtIso: options.finalize ? (nowIso ? nowIso() : new Date().toISOString()) : undefined,
  });
  ttsLastControllerActionRef.current = telemetryUpdate.nextControllerAction;
  telemetryRef.current = telemetryUpdate.telemetry;

  return {
    metrics: {
      controllerState: metricSnapshot.controllerAction,
      rate: metricSnapshot.rate,
      lagSec: metricSnapshot.lagSec,
      lagWords: metricSnapshot.lagWords,
      wpm: metricSnapshot.wpm,
      accuracy: metricSnapshot.accuracy,
      trend: metricSnapshot.trend,
      score: metricSnapshot.score,
      points: metricSnapshot.evaluation.points,
    },
    telemetry: telemetryUpdate.telemetry,
  };
}
