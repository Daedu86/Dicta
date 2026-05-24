import { describe, expect, it } from 'vitest';
import { buildSessionScoreHelpText, computeSessionScore } from '../src/core/sessionScore';

describe('computeSessionScore', () => {
  it('preserves the weighted session score formula', () => {
    expect(computeSessionScore({
      points: 163,
      accuracy: 80.7,
      wpm: 79.1,
      rate: 0.84,
      lagSec: 0,
    })).toBe(569);
  });

  it('adds the steady playback rate bonus near 1.0x', () => {
    expect(computeSessionScore({
      points: 10,
      accuracy: 90,
      wpm: 50,
      rate: 1,
      lagSec: 0,
    })).toBe(110);
  });
});

describe('buildSessionScoreHelpText', () => {
  it('explains the formula and concrete contribution breakdown', () => {
    const helpText = buildSessionScoreHelpText({
      points: 250,
      accuracy: 81.7,
      wpm: 79.1,
      rate: 0.84,
      lagSec: 0,
      score: 831,
    });

    expect(helpText).toContain('points * 3 + accuracy * 0.65 + min(WPM, 120) * 0.35 + rate bonus - abs(lag) * 8');
    expect(helpText).toContain('points 250 * 3 = 750');
    expect(helpText).toContain('accuracy 81.7 * 0.65 = 53.11');
    expect(helpText).toContain('WPM min(79.1, 120) * 0.35 = 27.68');
    expect(helpText).toContain('rate bonus = 0');
    expect(helpText).toContain('lag penalty abs(0) * 8 = 0');
    expect(helpText).toContain('final score = 831');
  });

  it('shows the rate bonus and absolute lag penalty', () => {
    const helpText = buildSessionScoreHelpText({
      points: 10,
      accuracy: 90,
      wpm: 50,
      rate: 1,
      lagSec: -2,
      score: 94,
    });

    expect(helpText).toContain('rate bonus = 4');
    expect(helpText).toContain('lag penalty abs(-2) * 8 = 16');
  });
});
