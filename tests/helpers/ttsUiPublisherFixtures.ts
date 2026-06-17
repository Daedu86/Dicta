import { vi } from 'vitest';
import type { TtsPublishedUiState } from '../../src/app/sessionTypes';
import {
  createTtsUiPublisher,
  type TtsUiPublisherOptions,
} from '../../src/app/useTtsUiPublisher';

type Ref<T> = {
  current: T;
};

function ref<T>(current: T): Ref<T> {
  return { current };
}

export function baseUiState(overrides: Partial<TtsPublishedUiState> = {}): TtsPublishedUiState {
  return {
    controllerState: 'hold',
    rate: 1,
    lagSec: 0,
    lagWords: 0,
    wpm: 0,
    accuracy: 100,
    trend: 'stable',
    ...overrides,
  };
}

export function createHarness(overrides: Partial<TtsUiPublisherOptions> = {}) {
  const state = baseUiState();
  const calls = {
    setAccuracy: vi.fn((value: number) => {
      state.accuracy = value;
    }),
    setControllerState: vi.fn((value: TtsPublishedUiState['controllerState']) => {
      state.controllerState = value;
    }),
    setLagSec: vi.fn((value: number) => {
      state.lagSec = value;
    }),
    setLagWords: vi.fn((value: number) => {
      state.lagWords = value;
    }),
    setRate: vi.fn((value: number) => {
      state.rate = value;
    }),
    setTrend: vi.fn((value: TtsPublishedUiState['trend']) => {
      state.trend = value;
    }),
    setWpm: vi.fn((value: number) => {
      state.wpm = value;
    }),
  };
  const refs = {
    published: ref(baseUiState()),
    publishedAt: ref(0),
  };
  const options: TtsUiPublisherOptions = {
    ttsPublishedUiRef: refs.published,
    ttsUiLastPublishedAtRef: refs.publishedAt,
    controllerState: state.controllerState,
    rate: state.rate,
    lagSec: state.lagSec,
    lagWords: state.lagWords,
    wpm: state.wpm,
    accuracy: state.accuracy,
    trend: state.trend,
    setControllerState: calls.setControllerState,
    setRate: calls.setRate,
    setLagSec: calls.setLagSec,
    setLagWords: calls.setLagWords,
    setWpm: calls.setWpm,
    setAccuracy: calls.setAccuracy,
    setTrend: calls.setTrend,
    ...overrides,
  };

  return {
    calls,
    publisher: createTtsUiPublisher(options),
    refs,
    state,
  };
}
