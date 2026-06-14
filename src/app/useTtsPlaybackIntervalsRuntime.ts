import { useEffect } from 'react';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import type { TtsStatus } from './sessionTypes';

type WritableRef<T> = {
  current: T;
};

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

export type IntervalScheduler = {
  setInterval: (callback: () => void, delayMs: number) => number;
  clearInterval: (intervalId: number) => void;
};

export type TtsPlaybackIntervalState = {
  activeInputMode: string;
  activeSessionFinished: boolean;
  ttsHasText: boolean;
  ttsStatus: TtsStatus;
};

export type TtsPerformanceSamplingIntervalOptions = TtsPlaybackIntervalState & {
  tickMs: number;
  applyTtsPerformanceSampleRef: WritableRef<() => void>;
};

export type TtsPlayerProgressIntervalOptions = {
  ttsStatus: TtsStatus;
  setTtsPlayerProgressTick: StateSetter<number>;
};

export type TtsPlaybackIntervalsRuntimeOptions =
  TtsPerformanceSamplingIntervalOptions &
  TtsPlayerProgressIntervalOptions;

function getWindowIntervalScheduler(): IntervalScheduler {
  return {
    setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
    clearInterval: (intervalId) => window.clearInterval(intervalId),
  };
}

export function shouldRunTtsPerformanceSampling({
  activeInputMode,
  activeSessionFinished,
  ttsHasText,
  ttsStatus,
}: TtsPlaybackIntervalState): boolean {
  return activeInputMode === BROWSER_TTS_SESSION_INPUT_MODE
    && !activeSessionFinished
    && ttsHasText
    && ttsStatus === 'playing';
}

export function startTtsPerformanceSamplingInterval(
  options: TtsPerformanceSamplingIntervalOptions,
  scheduler: IntervalScheduler = getWindowIntervalScheduler(),
): (() => void) | undefined {
  if (!shouldRunTtsPerformanceSampling(options)) {
    return undefined;
  }

  const intervalId = scheduler.setInterval(() => {
    options.applyTtsPerformanceSampleRef.current();
  }, options.tickMs);

  return () => scheduler.clearInterval(intervalId);
}

export function startTtsPlayerProgressInterval(
  {
    ttsStatus,
    setTtsPlayerProgressTick,
  }: TtsPlayerProgressIntervalOptions,
  scheduler: IntervalScheduler = getWindowIntervalScheduler(),
): (() => void) | undefined {
  if (ttsStatus !== 'playing') {
    return undefined;
  }

  const intervalId = scheduler.setInterval(() => {
    setTtsPlayerProgressTick((value) => value + 1);
  }, 500);

  return () => scheduler.clearInterval(intervalId);
}

export function useTtsPlaybackIntervalsRuntime({
  activeInputMode,
  activeSessionFinished,
  ttsHasText,
  ttsStatus,
  tickMs,
  applyTtsPerformanceSampleRef,
  setTtsPlayerProgressTick,
}: TtsPlaybackIntervalsRuntimeOptions): void {
  useEffect(() => startTtsPerformanceSamplingInterval({
    activeInputMode,
    activeSessionFinished,
    ttsHasText,
    ttsStatus,
    tickMs,
    applyTtsPerformanceSampleRef,
  }), [
    activeInputMode,
    activeSessionFinished,
    applyTtsPerformanceSampleRef,
    tickMs,
    ttsHasText,
    ttsStatus,
  ]);

  useEffect(() => startTtsPlayerProgressInterval({
    ttsStatus,
    setTtsPlayerProgressTick,
  }), [
    setTtsPlayerProgressTick,
    ttsStatus,
  ]);
}
