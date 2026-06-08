import { describe, expect, it } from 'vitest';
import { buildSessionScoreHelpText, computeSessionScore } from '../src/core/sessionScore';
import { createDefaultListeningPrecisionMetrics } from '../src/core/adaptive/listeningPrecisionMetrics';

describe('computeSessionScore', () => {
  it('uses listening-first weighted score without WPM credit', () => {
    expect(computeSessionScore({
      points: 163,
      accuracy: 80.7,
      wpm: 79.1,
      rate: 0.84,
      lagSec: 0,
    })).toBe(578);
  });

  it('keeps WPM diagnostic and does not let faster typing raise score', () => {
    const base = {
      points: 20,
      accuracy: 90,
      rate: 0.9,
      lagSec: 0,
    };

    expect(computeSessionScore({ ...base, wpm: 30 })).toBe(computeSessionScore({ ...base, wpm: 110 }));
  });

  it('lets explicit listening precision override plain accuracy for score credit', () => {
    const listeningPrecision = {
      ...createDefaultListeningPrecisionMetrics(),
      listeningRecallScore: 0.5,
      contentWordRecall: 0.5,
      detailPrecisionScore: 0.5,
      functionWordAccuracy: 0.5,
      wordOrderAccuracy: 0.5,
      lateCompletionRate: 0,
    };

    expect(computeSessionScore({
      points: 10,
      accuracy: 90,
      wpm: 50,
      rate: 1,
      lagSec: 0,
      listeningPrecision,
    })).toBe(99);
  });

  it('adds the steady playback rate bonus near 1.0x', () => {
    expect(computeSessionScore({
      points: 10,
      accuracy: 90,
      wpm: 50,
      rate: 1,
      lagSec: 0,
    })).toBe(133);
  });
});

describe('buildSessionScoreHelpText', () => {
  it('explains the listening-first formula and concrete contribution breakdown', () => {
    const helpText = buildSessionScoreHelpText({
      points: 250,
      accuracy: 81.7,
      wpm: 79.1,
      rate: 0.84,
      lagSec: 0,
      score: 840,
    });

    expect(helpText).toContain('points * 3 + listening precision * 0.85 + accuracy * 0.25 + rate bonus - abs(lag) * 8');
    expect(helpText).toContain('WPM is shown as a diagnostic signal only');
    expect(helpText).toContain('points 250 * 3 = 750');
    expect(helpText).toContain('listening precision 81.7 * 0.85 = 69.44');
    expect(helpText).toContain('accuracy 81.7 * 0.25 = 20.43');
    expect(helpText).toContain('diagnostic WPM min(79.1, 120) = 79.1');
    expect(helpText).toContain('rate bonus = 0');
    expect(helpText).toContain('lag penalty abs(0) * 8 = 0');
    expect(helpText).toContain('final score = 840');
  });

  it('shows the rate bonus and absolute lag penalty', () => {
    const helpText = buildSessionScoreHelpText({
      points: 10,
      accuracy: 90,
      wpm: 50,
      rate: 1,
      lagSec: -2,
      score: 117,
    });

    expect(helpText).toContain('rate bonus = 4');
    expect(helpText).toContain('lag penalty abs(-2) * 8 = 16');
  });
});
