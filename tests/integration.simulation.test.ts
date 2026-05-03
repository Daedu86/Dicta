import { describe, expect, it } from 'vitest';
import { SyncController } from '../src/core/syncController';
import { DEFAULT_CONFIG } from '../src/core/config';
import type { SyncState, Transcript } from '../src/types/dictation';

const transcript: Transcript = {
  words: Array.from({ length: 200 }, (_, i) => ({ word: `w${i}`, start: i * 0.3, end: i * 0.3 + 0.2 })),
};

function nextState(audioTime: number, typedWordIndex: number): SyncState {
  const expectedWordIndex = Math.floor(audioTime / 0.3);
  const expectedTypedTime = typedWordIndex * 0.3;
  return {
    audioTime,
    typedWordIndex,
    expectedWordIndex,
    lagWords: expectedWordIndex - typedWordIndex,
    lagSec: audioTime - expectedTypedTime,
    wpm: 48,
    accuracy: 95,
  };
}

describe('integration simulation', () => {
  it('converges lag without aggressive oscillation for slow typist profile', () => {
    const c = new SyncController(DEFAULT_CONFIG);
    let rate = 1;
    let audioTime = 0;
    let typedWord = 0;
    let actionSwitches = 0;
    let lastAction = 'hold';
    let minRateSeen = 1;

    for (let i = 0; i < 180; i += 1) {
      audioTime += 0.12 * rate;
      typedWord += 0.18; // slower than audio baseline
      const state = nextState(audioTime, Math.floor(typedWord));
      const d = c.decide(state, rate, i * 120 + 1000, transcript);
      if (d.action !== lastAction) actionSwitches += 1;
      lastAction = d.action;
      rate = d.nextRate;
      minRateSeen = Math.min(minRateSeen, rate);
    }

    const finalLag = nextState(audioTime, Math.floor(typedWord)).lagSec;
    expect(finalLag).toBeLessThan(10.5);
    expect(minRateSeen).toBeLessThanOrEqual(0.9);
    expect(actionSwitches).toBeLessThan(70);
  });
});
