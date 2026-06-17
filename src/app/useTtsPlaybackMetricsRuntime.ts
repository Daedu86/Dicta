import { useMemo } from 'react';
import {
  createTtsTelemetryRecorder,
} from './useTtsTelemetryRecorder';
import {
  createTtsUiPublisher,
} from './useTtsUiPublisher';
import {
  createTtsPlaybackMetricsRuntimeMemoDeps,
} from './ttsPlaybackMetricsRuntimeMemoDeps';
import {
  createTtsPerformanceSampleRuntime,
} from './ttsPlaybackPerformanceSampleRuntime';
import {
  createTtsSpokenWordEstimator,
} from './ttsPlaybackSpokenWordEstimator';
import type {
  TtsPlaybackMetricsRuntime,
  TtsPlaybackMetricsRuntimeOptions,
} from './useTtsPlaybackMetricsRuntimeTypes';

export type {
  TtsPlaybackMetricsRuntime,
  TtsPlaybackMetricsRuntimeOptions,
} from './useTtsPlaybackMetricsRuntimeTypes';

export function createTtsPlaybackMetricsRuntime(
  options: TtsPlaybackMetricsRuntimeOptions,
): TtsPlaybackMetricsRuntime {
  const nowMs = options.nowMs ?? (() => performance.now());

  const {
    ensureAttemptTelemetry,
    getTtsElapsedSeconds,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
  } = createTtsTelemetryRecorder({
    telemetryRef: options.telemetryRef,
    ttsStartedAtMsRef: options.ttsStartedAtMsRef,
    ttsSpeechRate: options.ttsSpeechRate,
    nowMs,
    nowIso: options.nowIso,
  });

  const estimateTtsSpokenWordIndex = createTtsSpokenWordEstimator({
    ttsTranscript: options.ttsTranscript,
    ttsStatus: options.ttsStatus,
    ttsSpeechRate: options.ttsSpeechRate,
    ttsChunkStartMsRef: options.ttsChunkStartMsRef,
    ttsChunkWordCountRef: options.ttsChunkWordCountRef,
    ttsChunkStartWordIndexRef: options.ttsChunkStartWordIndexRef,
    ttsCompletedSourceWordsRef: options.ttsCompletedSourceWordsRef,
    baseWordsPerSecond: options.baseWordsPerSecond,
    nowMs,
  });

  const publishTtsUiState = createTtsUiPublisher({
    ttsPublishedUiRef: options.ttsPublishedUiRef,
    ttsUiLastPublishedAtRef: options.ttsUiLastPublishedAtRef,
    controllerState: options.controllerState,
    rate: options.rate,
    lagSec: options.lagSec,
    lagWords: options.lagWords,
    wpm: options.wpm,
    accuracy: options.accuracy,
    trend: options.trend,
    setControllerState: options.setControllerState,
    setRate: options.setRate,
    setLagSec: options.setLagSec,
    setLagWords: options.setLagWords,
    setWpm: options.setWpm,
    setAccuracy: options.setAccuracy,
    setTrend: options.setTrend,
    minPublishIntervalMs: options.minPublishIntervalMs,
  });

  const applyTtsPerformanceSample = createTtsPerformanceSampleRuntime({
    ttsStartedAtMsRef: options.ttsStartedAtMsRef,
    ttsPracticeLiveTextRef: options.ttsPracticeLiveTextRef,
    ttsTranscript: options.ttsTranscript,
    ttsSpeechRate: options.ttsSpeechRate,
    ttsLanguage: options.ttsLanguage,
    ttsLastValidControlLagSecRef: options.ttsLastValidControlLagSecRef,
    ttsLagOutlierCountRef: options.ttsLagOutlierCountRef,
    ttsLiveSignalRef: options.ttsLiveSignalRef,
    previousLagRef: options.previousLagRef,
    previousAccuracyRef: options.previousAccuracyRef,
    telemetryRef: options.telemetryRef,
    ttsLastControllerActionRef: options.ttsLastControllerActionRef,
    estimateTtsSpokenWordIndex,
    getTtsElapsedSeconds,
    ensureAttemptTelemetry,
    publishTtsUiState,
    nowMs,
    nowIso: options.nowIso,
  });

  options.applyTtsPerformanceSampleRef.current = applyTtsPerformanceSample;

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
    createTtsPlaybackMetricsRuntimeMemoDeps(options),
  );
}
