import { useMemo } from 'react';
import type { TtsPublishedUiState } from './sessionTypes';

type WritableRef<T> = {
  current: T;
};

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

export type TtsUiPublisher = (next: TtsPublishedUiState, now: number, force?: boolean) => void;

export type TtsUiPublisherOptions = {
  ttsPublishedUiRef: WritableRef<TtsPublishedUiState>;
  ttsUiLastPublishedAtRef: WritableRef<number>;
  controllerState: TtsPublishedUiState['controllerState'];
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: TtsPublishedUiState['trend'];
  setControllerState: StateSetter<TtsPublishedUiState['controllerState']>;
  setRate: StateSetter<number>;
  setLagSec: StateSetter<number>;
  setLagWords: StateSetter<number>;
  setWpm: StateSetter<number>;
  setAccuracy: StateSetter<number>;
  setTrend: StateSetter<TtsPublishedUiState['trend']>;
  minPublishIntervalMs?: number;
};

export function hasTtsUiStateChanged(previous: TtsPublishedUiState, next: TtsPublishedUiState): boolean {
  return (
    previous.controllerState !== next.controllerState ||
    Math.abs(previous.rate - next.rate) > 0.005 ||
    Math.abs(previous.lagSec - next.lagSec) > 0.05 ||
    previous.lagWords !== next.lagWords ||
    Math.abs(previous.wpm - next.wpm) > 0.5 ||
    Math.abs(previous.accuracy - next.accuracy) > 0.1 ||
    previous.trend !== next.trend
  );
}

export function createTtsUiPublisher({
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
  minPublishIntervalMs = 500,
}: TtsUiPublisherOptions): TtsUiPublisher {
  return (next, now, force = false) => {
    const previous = ttsPublishedUiRef.current;
    const changed = hasTtsUiStateChanged(previous, next);

    if (!force && (!changed || now - ttsUiLastPublishedAtRef.current < minPublishIntervalMs)) {
      return;
    }

    ttsPublishedUiRef.current = next;
    ttsUiLastPublishedAtRef.current = now;

    if (force || controllerState !== next.controllerState) setControllerState(next.controllerState);
    if (force || Math.abs(rate - next.rate) > 0.005) setRate(next.rate);
    if (force || Math.abs(lagSec - next.lagSec) > 0.05) setLagSec(next.lagSec);
    if (force || lagWords !== next.lagWords) setLagWords(next.lagWords);
    if (force || Math.abs(wpm - next.wpm) > 0.5) setWpm(next.wpm);
    if (force || Math.abs(accuracy - next.accuracy) > 0.1) setAccuracy(next.accuracy);
    if (force || trend !== next.trend) setTrend(next.trend);
  };
}

export function useTtsUiPublisher(options: TtsUiPublisherOptions): TtsUiPublisher {
  return useMemo(
    () => createTtsUiPublisher(options),
    [
      options.accuracy,
      options.controllerState,
      options.lagSec,
      options.lagWords,
      options.minPublishIntervalMs,
      options.rate,
      options.setAccuracy,
      options.setControllerState,
      options.setLagSec,
      options.setLagWords,
      options.setRate,
      options.setTrend,
      options.setWpm,
      options.trend,
      options.ttsPublishedUiRef,
      options.ttsUiLastPublishedAtRef,
      options.wpm,
    ],
  );
}
