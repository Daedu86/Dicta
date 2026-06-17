import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  shouldRunTtsPerformanceSampling,
  startTtsPerformanceSamplingInterval,
  startTtsPlayerProgressInterval,
} from '../src/app/useTtsPlaybackIntervalsRuntime';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import { createFakeIntervalScheduler } from './helpers/ttsIntervalSchedulerFixtures';

describe('TTS playback intervals runtime', () => {
  it('only samples TTS performance while browser TTS is actively playing text', () => {
    expect(shouldRunTtsPerformanceSampling({
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
      activeSessionFinished: false,
      ttsHasText: true,
      ttsStatus: 'playing',
    })).toBe(true);

    for (const inactiveCase of [
      { activeInputMode: 'keyboard' as const },
      { activeSessionFinished: true },
      { ttsHasText: false },
      { ttsStatus: 'paused' as const },
    ]) {
      expect(shouldRunTtsPerformanceSampling({
        activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
        activeSessionFinished: false,
        ttsHasText: true,
        ttsStatus: 'playing',
        ...inactiveCase,
      })).toBe(false);
    }
  });

  it('starts and cleans up the performance sampling interval', () => {
    const {
      scheduler,
      intervals,
    } = createFakeIntervalScheduler();
    const applyTtsPerformanceSample = vi.fn();

    const cleanup = startTtsPerformanceSamplingInterval({
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
      activeSessionFinished: false,
      ttsHasText: true,
      ttsStatus: 'playing',
      tickMs: 250,
      applyTtsPerformanceSampleRef: {
        current: applyTtsPerformanceSample,
      },
    }, scheduler);

    expect(intervals).toHaveLength(1);
    expect(intervals[0].delayMs).toBe(250);

    intervals[0].callback();

    expect(applyTtsPerformanceSample).toHaveBeenCalledTimes(1);

    cleanup?.();

    expect(intervals[0].cleared).toBe(true);
    expect(scheduler.clearInterval).toHaveBeenCalledWith(intervals[0].id);
  });

  it('does not start the performance sampling interval when preconditions are not met', () => {
    const {
      scheduler,
      intervals,
    } = createFakeIntervalScheduler();

    const cleanup = startTtsPerformanceSamplingInterval({
      activeInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
      activeSessionFinished: false,
      ttsHasText: true,
      ttsStatus: 'paused',
      tickMs: 250,
      applyTtsPerformanceSampleRef: {
        current: vi.fn(),
      },
    }, scheduler);

    expect(cleanup).toBeUndefined();
    expect(intervals).toHaveLength(0);
  });

  it('starts and cleans up the player progress interval while playing', () => {
    const {
      scheduler,
      intervals,
    } = createFakeIntervalScheduler();
    let progressTick = 0;
    const setTtsPlayerProgressTick = vi.fn((next: number | ((current: number) => number)) => {
      progressTick = typeof next === 'function'
        ? next(progressTick)
        : next;
    });

    const cleanup = startTtsPlayerProgressInterval({
      ttsStatus: 'playing',
      setTtsPlayerProgressTick,
    }, scheduler);

    expect(intervals).toHaveLength(1);
    expect(intervals[0].delayMs).toBe(500);

    intervals[0].callback();
    intervals[0].callback();

    expect(progressTick).toBe(2);
    expect(setTtsPlayerProgressTick).toHaveBeenCalledTimes(2);

    cleanup?.();

    expect(intervals[0].cleared).toBe(true);
  });

  it('does not start the player progress interval when playback is not playing', () => {
    const {
      scheduler,
      intervals,
    } = createFakeIntervalScheduler();

    const cleanup = startTtsPlayerProgressInterval({
      ttsStatus: 'idle',
      setTtsPlayerProgressTick: vi.fn(),
    }, scheduler);

    expect(cleanup).toBeUndefined();
    expect(intervals).toHaveLength(0);
  });
});
