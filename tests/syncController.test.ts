import { describe, expect, it } from 'vitest';
import { SyncController } from '../src/core/syncController';
import { DEFAULT_CONFIG } from '../src/core/config';
import type { SyncState, Transcript } from '../src/types/dictation';

const transcript: Transcript = {
  words: Array.from({ length: 20 }, (_, i) => ({ word: `w${i}`, start: i * 0.5, end: i * 0.5 + 0.4 })),
};

function state(overrides: Partial<SyncState>): SyncState {
  return {
    audioTime: 5,
    typedWordIndex: 10,
    expectedWordIndex: 10,
    lagWords: 0,
    lagSec: 0,
    wpm: 40,
    accuracy: 95,
    ...overrides,
  };
}

describe('SyncController', () => {
  it('slows down when user is behind', () => {
    const c = new SyncController(DEFAULT_CONFIG);
    const decision = c.decide(state({ lagSec: 1.8, lagWords: 3 }), 1, 1000, transcript);
    expect(decision.action).toBe('speed_down');
    expect(decision.nextRate).toBeLessThan(1);
  });

  it('triggers pause_repeat for hard lag', () => {
    const c = new SyncController(DEFAULT_CONFIG);
    const decision = c.decide(state({ lagSec: 3.2, lagWords: 8, expectedWordIndex: 14 }), 1, 1000, transcript);
    expect(decision.action).toBe('pause_repeat');
    expect(decision.repeatFromSec).toBeDefined();
  });

  it('speeds up when user is ahead with high accuracy', () => {
    const c = new SyncController(DEFAULT_CONFIG);
    const decision = c.decide(state({ lagSec: -1.8, accuracy: 98 }), 1, 1000, transcript);
    expect(decision.action).toBe('speed_up');
    expect(decision.nextRate).toBeGreaterThan(1);
  });

  it('enforces hysteresis', () => {
    const c = new SyncController(DEFAULT_CONFIG);
    const first = c.decide(state({ lagSec: 1.6 }), 1, 1000, transcript);
    const second = c.decide(state({ lagSec: 1.6 }), first.nextRate, 1200, transcript);
    expect(first.action).toBe('speed_down');
    expect(second.action).toBe('hold');
    expect(second.nextRate).toBe(first.nextRate);
  });
});
