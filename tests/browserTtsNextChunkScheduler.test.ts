import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BROWSER_TTS_MIN_MENTAL_REST_MS,
  DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS,
  scheduleBrowserTtsNextChunk,
} from '../src/app/browserTtsNextChunkScheduler';

describe('scheduleBrowserTtsNextChunk', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('speaks the next chunk immediately when no pause is requested', () => {
    const scheduleTimeout = vi.fn();
    const speakNext = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: false,
      pauseBeforeNextChunkMs: 750,
      scheduleTimeout,
      onResolved,
      speakNext,
    });

    expect(scheduleTimeout).not.toHaveBeenCalled();
    expect(onResolved).toHaveBeenCalledWith(0, 'no-gate');
    expect(speakNext).toHaveBeenCalledTimes(1);
  });

  it('defers the next chunk with the requested pause when pacing requests a pause', () => {
    const scheduleTimeout = vi.fn();
    const speakNext = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 750,
      scheduleTimeout,
      onResolved,
      speakNext,
    });

    expect(speakNext).not.toHaveBeenCalled();
    expect(onResolved).not.toHaveBeenCalled();
    expect(scheduleTimeout).toHaveBeenCalledTimes(1);
    expect(scheduleTimeout).toHaveBeenCalledWith(expect.any(Function), 750);

    const [callback] = scheduleTimeout.mock.calls[0];
    callback();

    expect(onResolved).toHaveBeenCalledWith(750, 'no-gate');
    expect(speakNext).toHaveBeenCalledTimes(1);
  });

  it('uses the minimum mental rest for fixed pauses below the minimum', () => {
    const scheduleTimeout = vi.fn();
    const speakNext = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 300,
      scheduleTimeout,
      onResolved,
      speakNext,
    });

    expect(speakNext).not.toHaveBeenCalled();
    expect(scheduleTimeout).toHaveBeenCalledTimes(1);
    expect(scheduleTimeout).toHaveBeenCalledWith(expect.any(Function), BROWSER_TTS_MIN_MENTAL_REST_MS);

    const [callback] = scheduleTimeout.mock.calls[0];
    callback();

    expect(onResolved).toHaveBeenCalledWith(BROWSER_TTS_MIN_MENTAL_REST_MS, 'no-gate');
    expect(speakNext).toHaveBeenCalledTimes(1);
  });

  it('uses configured safe pause settings for fixed pauses below the configured minimum', () => {
    const scheduleTimeout = vi.fn();
    const speakNext = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 300,
      safePauseGateSettings: {
        minimumMentalRestMs: 900,
        completionGateMaxWaitMs: DEFAULT_BROWSER_TTS_SAFE_PAUSE_GATE_SETTINGS.completionGateMaxWaitMs,
      },
      scheduleTimeout,
      onResolved,
      speakNext,
    });

    expect(scheduleTimeout).toHaveBeenCalledWith(expect.any(Function), 900);

    const [callback] = scheduleTimeout.mock.calls[0];
    callback();

    expect(onResolved).toHaveBeenCalledWith(900, 'no-gate');
    expect(speakNext).toHaveBeenCalledTimes(1);
  });

  it('waits the minimum mental rest when the completion gate becomes complete early', () => {
    vi.useFakeTimers();
    let complete = false;
    const speakNext = vi.fn();
    const completionGateResolved = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 1400,
      scheduleTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
      completionGate: {
        isComplete: () => complete,
        onResolved: completionGateResolved,
      },
      onResolved,
      speakNext,
    });

    expect(speakNext).not.toHaveBeenCalled();

    complete = true;
    vi.advanceTimersByTime(100);

    expect(speakNext).not.toHaveBeenCalled();
    expect(completionGateResolved).not.toHaveBeenCalled();
    expect(onResolved).not.toHaveBeenCalled();

    vi.advanceTimersByTime(BROWSER_TTS_MIN_MENTAL_REST_MS - 100);

    expect(speakNext).toHaveBeenCalledTimes(1);
    expect(completionGateResolved).toHaveBeenCalledWith(BROWSER_TTS_MIN_MENTAL_REST_MS, 'completed');
    expect(onResolved).toHaveBeenCalledWith(BROWSER_TTS_MIN_MENTAL_REST_MS, 'completed');
  });

  it('waits the minimum mental rest when a manual submitted gate resolves early', () => {
    vi.useFakeTimers();
    let submitted = false;
    const speakNext = vi.fn();
    const completionGateResolved = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 1400,
      scheduleTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
      completionGate: {
        isComplete: () => false,
        getResolutionReason: () => (submitted ? 'submitted' : null),
        onResolved: completionGateResolved,
      },
      onResolved,
      speakNext,
    });

    submitted = true;
    vi.advanceTimersByTime(100);

    expect(speakNext).not.toHaveBeenCalled();
    expect(completionGateResolved).not.toHaveBeenCalled();
    expect(onResolved).not.toHaveBeenCalled();

    vi.advanceTimersByTime(BROWSER_TTS_MIN_MENTAL_REST_MS - 100);

    expect(speakNext).toHaveBeenCalledTimes(1);
    expect(completionGateResolved).toHaveBeenCalledWith(BROWSER_TTS_MIN_MENTAL_REST_MS, 'submitted');
    expect(onResolved).toHaveBeenCalledWith(BROWSER_TTS_MIN_MENTAL_REST_MS, 'submitted');
  });

  it('waits the configured minimum mental rest when the completion gate becomes complete early', () => {
    vi.useFakeTimers();
    let complete = false;
    const speakNext = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 1400,
      safePauseGateSettings: {
        minimumMentalRestMs: 900,
        completionGateMaxWaitMs: 4000,
      },
      scheduleTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
      completionGate: {
        isComplete: () => complete,
      },
      onResolved,
      speakNext,
    });

    complete = true;
    vi.advanceTimersByTime(100);

    expect(speakNext).not.toHaveBeenCalled();

    vi.advanceTimersByTime(800);

    expect(speakNext).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith(900, 'completed');
  });

  it('starts after the actual gate completion wait when completion happens after the minimum rest', () => {
    vi.useFakeTimers();
    let complete = false;
    const speakNext = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 1400,
      scheduleTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
      completionGate: {
        isComplete: () => complete,
      },
      onResolved,
      speakNext,
    });

    vi.advanceTimersByTime(899);
    expect(speakNext).not.toHaveBeenCalled();

    complete = true;
    vi.advanceTimersByTime(1);

    expect(speakNext).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith(900, 'completed');
  });

  it('falls back after 4000ms when the completion gate never completes', () => {
    vi.useFakeTimers();
    const speakNext = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 900,
      scheduleTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
      completionGate: {
        isComplete: () => false,
      },
      onResolved,
      speakNext,
    });

    vi.advanceTimersByTime(3999);
    expect(speakNext).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(speakNext).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith(4000, 'timeout');
  });

  it('uses the configured max fallback when the completion gate never completes', () => {
    vi.useFakeTimers();
    const speakNext = vi.fn();
    const onResolved = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 900,
      safePauseGateSettings: {
        minimumMentalRestMs: 700,
        completionGateMaxWaitMs: 3000,
      },
      scheduleTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
      completionGate: {
        isComplete: () => false,
      },
      onResolved,
      speakNext,
    });

    vi.advanceTimersByTime(2999);
    expect(speakNext).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(speakNext).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith(3000, 'timeout');
  });

  it('speaks the next chunk once when completion and timeout callbacks both fire', () => {
    const scheduledCallbacks: Array<() => void> = [];
    let complete = false;
    const speakNext = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 900,
      scheduleTimeout: (callback) => {
        scheduledCallbacks.push(callback);
      },
      completionGate: {
        isComplete: () => complete,
      },
      speakNext,
    });

    expect(scheduledCallbacks).toHaveLength(2);

    scheduledCallbacks[0]();
    complete = true;
    scheduledCallbacks[1]();

    expect(speakNext).toHaveBeenCalledTimes(1);
  });
});
