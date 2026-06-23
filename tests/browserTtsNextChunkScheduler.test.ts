import { afterEach, describe, expect, it, vi } from 'vitest';
import { scheduleBrowserTtsNextChunk } from '../src/app/browserTtsNextChunkScheduler';

describe('scheduleBrowserTtsNextChunk', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('speaks the next chunk immediately when no pause is requested', () => {
    const scheduleTimeout = vi.fn();
    const speakNext = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: false,
      pauseBeforeNextChunkMs: 750,
      scheduleTimeout,
      speakNext,
    });

    expect(scheduleTimeout).not.toHaveBeenCalled();
    expect(speakNext).toHaveBeenCalledTimes(1);
  });

  it('defers the next chunk with the requested pause when pacing requests a pause', () => {
    const scheduleTimeout = vi.fn();
    const speakNext = vi.fn();

    scheduleBrowserTtsNextChunk({
      shouldPauseBeforeNextChunk: true,
      pauseBeforeNextChunkMs: 750,
      scheduleTimeout,
      speakNext,
    });

    expect(speakNext).not.toHaveBeenCalled();
    expect(scheduleTimeout).toHaveBeenCalledTimes(1);
    expect(scheduleTimeout).toHaveBeenCalledWith(expect.any(Function), 750);

    const [callback] = scheduleTimeout.mock.calls[0];
    callback();

    expect(speakNext).toHaveBeenCalledTimes(1);
  });

  it('starts the next chunk early when the completion gate becomes complete', () => {
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
        onResolved,
      },
      speakNext,
    });

    expect(speakNext).not.toHaveBeenCalled();

    complete = true;
    vi.advanceTimersByTime(100);

    expect(speakNext).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith(100, 'completed');
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
        onResolved,
      },
      speakNext,
    });

    vi.advanceTimersByTime(3999);
    expect(speakNext).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(speakNext).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith(4000, 'timeout');
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
