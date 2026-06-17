import { vi } from 'vitest';
import type { IntervalScheduler } from '../../src/app/useTtsPlaybackIntervalsRuntime';

export type ScheduledInterval = {
  id: number;
  callback: () => void;
  delayMs: number;
  cleared: boolean;
};

export function createFakeIntervalScheduler() {
  const intervals: ScheduledInterval[] = [];
  let nextId = 1;

  const scheduler: IntervalScheduler = {
    setInterval: vi.fn((callback, delayMs) => {
      const id = nextId;
      nextId += 1;
      intervals.push({
        id,
        callback,
        delayMs,
        cleared: false,
      });
      return id;
    }),
    clearInterval: vi.fn((intervalId) => {
      const interval = intervals.find((item) => item.id === intervalId);
      if (interval) interval.cleared = true;
    }),
  };

  return {
    scheduler,
    intervals,
  };
}
