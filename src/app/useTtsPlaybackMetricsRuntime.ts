import { useMemo } from 'react';
import {
  createTtsTelemetryRecorder,
} from './useTtsTelemetryRecorder';
import {
  estimateTtsSpokenWordIndex as estimateTtsSpokenWordIndexForState,
} from './useTtsPlaybackProgressEstimator';
import {
  createTtsUiPublisher,
} from './useTtsUiPublisher';
import {
  sampleTtsPerformance,
  type TtsPerformanceSampleOptions,
} from './useTtsPerformanceSampler';
import type {
  TtsPerformanceSampleResult,
} from './sessionTypes';
import type {
  TtsPlaybackMetricsRuntime,
  TtsPlaybackMetricsRuntimeOptions,
} from './useTtsPlaybackMetricsRuntimeTypes';

export type {
  TtsPlaybackMetricsRuntime,
  TtsPlaybackMetricsRuntimeOptions,
} from './useTtsPlaybackMetricsRuntimeTypes';

export function createTtsPlaybackMetricsRuntime({
  ttsTranscript,
  ttsStatus,
  ttsSpeechRate,
  ttsLanguage,
  controllerState,
  rate,
  lagSec,
  lagWords,
  wpm,
  accuracy,
  trend,
  telemetryRef,
  ttsStartedAtMsRef,
  ttsPracticeLiveTextRef,
  ttsChunkStartMsRef,
  ttsChunkWordCountRef,
  ttsChunkStartWordIndexRef,
  ttsCompletedSourceWordsRef,
  ttsLastValidControlLagSecRef,
  ttsLagOutlierCountRef,
  ttsLiveSignalRef,
  previousLagRef,
  previousAccuracyRef,
  ttsLastControllerActionRef,
  ttsPublishedUiRef,
  ttsUiLastPublishedAtRef,
  applyTtsPerformanceSampleRef,
  setControllerState,
  setRate,
  setLagSec,
  setLagWords,
  setWpm,
  setAccuracy,
  setTrend,
  baseWordsPerSecond,
  minPublishIntervalMs,
  nowMs = () => performance.now(),
  nowIso,
}: TtsPlaybackMetricsRuntimeOptions): TtsPlaybackMetricsRuntime {
  const {
    ensureAttemptTelemetry,
    getTtsElapsedSeconds,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
  } = createTtsTelemetryRecorder({
    telemetryRef,
    ttsStartedAtMsRef,
    ttsSpeechRate,
    nowMs,
    nowIso,
  });

  function estimateTtsSpokenWordIndex(now = nowMs()): number {
    return estimateTtsSpokenWordIndexForState({
      sourceWordCount: ttsTranscript?.words.length ?? 0,
      ttsStatus,
      now,
      ttsChunkStartMs: ttsChunkStartMsRef.current,
      ttsSpeechRate,
      ttsChunkWordCount: ttsChunkWordCountRef.current,
      ttsChunkStartWordIndex: ttsChunkStartWordIndexRef.current,
      ttsCompletedSourceWords: ttsCompletedSourceWordsRef.current,
      baseWordsPerSecond,
    });
  }

  const publishTtsUiState = createTtsUiPublisher({
    ttsPublishedUiRef,
    ttsUiLastPublishedAtRef,
    controllerState,
    rate,
    lagSec,
    lagWords,
    wpm,
    accuracy,
    trend,
    setControllerState,
    setRate,
    setLagSec,
    setLagWords,
    setWpm,
    setAccuracy,
    setTrend,
    minPublishIntervalMs,
  });

  function applyTtsPerformanceSample(options: TtsPerformanceSampleOptions = {}): TtsPerformanceSampleResult {
    return sampleTtsPerformance(
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
      },
      options,
    );
  }

  applyTtsPerformanceSampleRef.current = applyTtsPerformanceSample;

  return {
    ensureAttemptTelemetry,
    getTtsElapsedSeconds,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
    estimateTtsSpokenWordIndex,
    applyTtsPerformanceSample,
  };
}

export function useTtsPlaybackMetricsRuntime(
  options: TtsPlaybackMetricsRuntimeOptions,
): TtsPlaybackMetricsRuntime {
  return useMemo(
    () => createTtsPlaybackMetricsRuntime(options),
    [
      options.accuracy,
      options.applyTtsPerformanceSampleRef,
      options.baseWordsPerSecond,
      options.controllerState,
      options.lagSec,
      options.lagWords,
      options.minPublishIntervalMs,
      options.nowIso,
      options.nowMs,
      options.previousAccuracyRef,
      options.previousLagRef,
      options.rate,
      options.setAccuracy,
      options.setControllerState,
      options.setLagSec,
      options.setLagWords,
      options.setRate,
      options.setTrend,
      options.setWpm,
      options.telemetryRef,
      options.trend,
      options.ttsChunkStartMsRef,
      options.ttsChunkStartWordIndexRef,
      options.ttsChunkWordCountRef,
      options.ttsCompletedSourceWordsRef,
      options.ttsLagOutlierCountRef,
      options.ttsLanguage,
      options.ttsLastControllerActionRef,
      options.ttsLastValidControlLagSecRef,
      options.ttsLiveSignalRef,
      options.ttsPracticeLiveTextRef,
      options.ttsPublishedUiRef,
      options.ttsSpeechRate,
      options.ttsStartedAtMsRef,
      options.ttsStatus,
      options.ttsTranscript,
      options.ttsUiLastPublishedAtRef,
      options.wpm,
    ],
  );
}
