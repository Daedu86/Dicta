import { describe, expect, it, vi } from 'vitest';
import type { TtsPublishedUiState } from '../src/app/sessionTypes';
import {
  createTtsUiPublisher,
  hasTtsUiStateChanged,
  type TtsUiPublisherOptions,
} from '../src/app/useTtsUiPublisher';

type Ref<T> = {
  current: T;
};

function ref<T>(current: T): Ref<T> {
  return { current };
}

function baseUiState(overrides: Partial<TtsPublishedUiState> = {}): TtsPublishedUiState {
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

function createHarness(overrides: Partial<TtsUiPublisherOptions> = {}) {
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

describe('hasTtsUiStateChanged', () => {
  it('uses the same threshold semantics as the App shell publisher', () => {
    const previous = baseUiState();

    expect(hasTtsUiStateChanged(previous, baseUiState())).toBe(false);
    expect(hasTtsUiStateChanged(previous, baseUiState({ rate: 1.004 }))).toBe(false);
    expect(hasTtsUiStateChanged(previous, baseUiState({ lagSec: 0.04 }))).toBe(false);
    expect(hasTtsUiStateChanged(previous, baseUiState({ wpm: 0.4 }))).toBe(false);
    expect(hasTtsUiStateChanged(previous, baseUiState({ accuracy: 99.95 }))).toBe(false);

    expect(hasTtsUiStateChanged(previous, baseUiState({ controllerState: 'speed_up' }))).toBe(true);
    expect(hasTtsUiStateChanged(previous, baseUiState({ rate: 1.006 }))).toBe(true);
    expect(hasTtsUiStateChanged(previous, baseUiState({ lagSec: 0.06 }))).toBe(true);
    expect(hasTtsUiStateChanged(previous, baseUiState({ lagWords: 1 }))).toBe(true);
    expect(hasTtsUiStateChanged(previous, baseUiState({ wpm: 0.6 }))).toBe(true);
    expect(hasTtsUiStateChanged(previous, baseUiState({ accuracy: 99.8 }))).toBe(true);
    expect(hasTtsUiStateChanged(previous, baseUiState({ trend: 'improving' }))).toBe(true);
  });
});

describe('createTtsUiPublisher', () => {
  it('does not publish unchanged state', () => {
    const { calls, publisher, refs } = createHarness();

    publisher(baseUiState(), 1000);

    expect(refs.publishedAt.current).toBe(0);
    expect(calls.setControllerState).not.toHaveBeenCalled();
    expect(calls.setRate).not.toHaveBeenCalled();
    expect(calls.setLagSec).not.toHaveBeenCalled();
    expect(calls.setLagWords).not.toHaveBeenCalled();
    expect(calls.setWpm).not.toHaveBeenCalled();
    expect(calls.setAccuracy).not.toHaveBeenCalled();
    expect(calls.setTrend).not.toHaveBeenCalled();
  });

  it('throttles changed state until the publish interval passes', () => {
    const { calls, publisher, refs } = createHarness();
    refs.publishedAt.current = 1000;

    publisher(baseUiState({ wpm: 10 }), 1300);

    expect(refs.published.current).toEqual(baseUiState());
    expect(refs.publishedAt.current).toBe(1000);
    expect(calls.setWpm).not.toHaveBeenCalled();
  });

  it('publishes changed state after the interval and only updates changed visible metrics', () => {
    const { calls, publisher, refs, state } = createHarness();
    const next = baseUiState({
      controllerState: 'speed_up',
      lagWords: 3,
      wpm: 42,
    });

    publisher(next, 600);

    expect(refs.published.current).toBe(next);
    expect(refs.publishedAt.current).toBe(600);
    expect(calls.setControllerState).toHaveBeenCalledWith('speed_up');
    expect(calls.setLagWords).toHaveBeenCalledWith(3);
    expect(calls.setWpm).toHaveBeenCalledWith(42);
    expect(calls.setRate).not.toHaveBeenCalled();
    expect(calls.setLagSec).not.toHaveBeenCalled();
    expect(calls.setAccuracy).not.toHaveBeenCalled();
    expect(calls.setTrend).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      controllerState: 'speed_up',
      lagWords: 3,
      wpm: 42,
    });
  });

  it('force-publishes unchanged state and refreshes all visible metric setters', () => {
    const { calls, publisher, refs } = createHarness();
    const next = baseUiState();

    publisher(next, 10, true);

    expect(refs.published.current).toBe(next);
    expect(refs.publishedAt.current).toBe(10);
    expect(calls.setControllerState).toHaveBeenCalledWith('hold');
    expect(calls.setRate).toHaveBeenCalledWith(1);
    expect(calls.setLagSec).toHaveBeenCalledWith(0);
    expect(calls.setLagWords).toHaveBeenCalledWith(0);
    expect(calls.setWpm).toHaveBeenCalledWith(0);
    expect(calls.setAccuracy).toHaveBeenCalledWith(100);
    expect(calls.setTrend).toHaveBeenCalledWith('stable');
  });
});
