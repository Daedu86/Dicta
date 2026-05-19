import { describe, expect, it } from 'vitest';
import { buildTrainingSubmitMessage } from '../src/core/trainingSubmitMessage';

describe('buildTrainingSubmitMessage', () => {
  it('reports rank, score percentage, and accuracy percentage for the submitted language leaderboard', () => {
    const message = buildTrainingSubmitMessage(
      [
        {
          id: 'en-better',
          inputMode: 'input2',
          ttsLanguage: 'en',
          metrics: { points: 120, score: 0.91, accuracy: 96.2 },
        },
        {
          id: 'submitted',
          inputMode: 'input2',
          ttsLanguage: 'en',
          metrics: { points: 100, score: 0.825, accuracy: 93.4 },
        },
        {
          id: 'de-top',
          inputMode: 'input2',
          ttsLanguage: 'de',
          metrics: { points: 999, score: 1, accuracy: 100 },
        },
      ],
      'submitted',
    );

    expect(message).toBe('Submitted to leaderboard. Position #2 (EN). Score 83%, Accuracy 93.4%.');
  });

  it('normalizes fractional accuracy values from legacy sessions', () => {
    const message = buildTrainingSubmitMessage(
      [
        {
          id: 'submitted',
          inputMode: 'input3',
          kokoroLanguage: 'es',
          metrics: { points: 50, score: 0.5, accuracy: 0.875 },
        },
      ],
      'submitted',
    );

    expect(message).toBe('Submitted to leaderboard. Position #1 (ES). Score 50%, Accuracy 87.5%.');
  });
});
