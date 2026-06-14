import { describe, expect, it, vi } from 'vitest';
import { scheduleBrowserTtsNextChunk } from '../src/app/browserTtsNextChunkScheduler';

describe('scheduleBrowserTtsNextChunk', () => {
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
});
