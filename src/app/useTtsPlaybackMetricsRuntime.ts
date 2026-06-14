import { useMemo } from 'react';
import type {
  ControlAction,
  SessionTelemetry,
  Transcript,
  TtsChunkTelemetry,
} from '../types/dictation';
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
  TtsLanguage,
  TtsPerformanceSampleResult,
  TtsPublishedUiState,
  TtsStatus,
} from './sessionTypes';
import type { TtsLiveSignal } from './ttsPlaybackProfile';

type WritableRef<T> = {
  current: T;
};

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

export type TtsPlaybackMetricsRuntimeOptions = {
  ttsTranscript: Transcript | null;
  ttsStatus: TtsStatus;
  ttsSpeechRate: number;
  ttsLanguage: TtsLanguage;
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: TtsPublishedUiState['trend'];
  telemetryRef: WritableRef<SessionTelemetry | null>;
  ttsStartedAtMsRef: WritableRef<number | null>;
  ttsPracticeLiveTextRef: WritableRef<string>;
  ttsChunkStartMsRef: WritableRef<number | null>;
  ttsChunkWordCountRef: WritableRef<number>;
  ttsChunkStartWordIndexRef: WritableRef<number>;
  ttsCompletedSourceWordsRef: WritableRef<number>;
  ttsLastValidControlLagSecRef: WritableRef<number>;
  ttsLagOutlierCountRef: WritableRef<number>;
  ttsLiveSignalRef: WritableRef<TtsLiveSignal>;
  previousLagRef: WritableRef<number>;
  previousAccuracyRef: WritableRef<number>;
  ttsLastControllerActionRef: WritableRef<ControlAction>;
  ttsPublishedUiRef: WritableRef<TtsPublishedUiState>;
  ttsUiLastPublishedAtRef: WritableRef<number>;
  applyTtsPerformanceSampleRef: WritableRef<() => void>;
  setControllerState: StateSetter<ControlAction>;
  setRate: StateSetter<number>;
  setLagSec: StateSetter<number>;
  setLagWords: StateSetter<number>;
  setWpm: StateSetter<number>;
  setAccuracy: StateSetter<number>;
  setTrend: StateSetter<TtsPublishedUiState['trend']>;
  baseWordsPerSecond: number;
  minPublishIntervalMs?: number;
  nowMs?: () => number;
  nowIso?: () => string;
};

export type TtsPlaybackMetricsRuntime = {
  ensureAttemptTelemetry: () => SessionTelemetry;
  getTtsElapsedSeconds: (now?: number) => number;
  recordTtsTelemetryAction: (action: ControlAction, actionRate?: number) => void;
  recordTtsChunkTelemetry: (chunk: Omit<TtsChunkTelemetry, 't'>) => void;
  estimateTtsSpokenWordIndex: (now?: number) => number;
  applyTtsPerformanceSample: (options?: TtsPerformanceSampleOptions) => TtsPerformanceSampleResult;
};

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
