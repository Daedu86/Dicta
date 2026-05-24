import { describe, expect, it } from 'vitest';
import { buildTrainingSubmitMessage } from '../src/core/trainingSubmitMessage';

describe('buildTrainingSubmitMessage', () => {
  it('reports rank, raw score, and media-player voice duration for the submitted language leaderboard', () => {
    const message = buildTrainingSubmitMessage(
      [
        {
          id: 'en-better',
          inputMode: 'input2',
          ttsLanguage: 'en',
          ttsText: 'one two three four five',
          metrics: { points: 5, score: 411, accuracy: 96.2 },
        },
        {
          id: 'submitted',
          inputMode: 'input2',
          ttsLanguage: 'en',
          ttsText: 'one two three four five six',
          metrics: { points: 4, score: 297, accuracy: 93.4 },
          telemetry: { startedAt: '2026-05-20T20:00:00.000Z', finishedAt: '2026-05-20T20:04:12.000Z' },
        },
        {
          id: 'de-top',
          inputMode: 'input2',
          ttsLanguage: 'de',
          ttsText: 'eins zwei',
          metrics: { points: 999, score: 999, accuracy: 100 },
        },
      ],
      'submitted',
    );

    expect(message).toBe('Submitted to leaderboard. Position #2 (EN). Score 297, Accuracy 93.4%, Points 4/6, Duration 2s.');
  });

  it('normalizes fractional accuracy values from legacy sessions without treating score as a percent', () => {
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

    expect(message).toBe('Submitted to leaderboard. Position #1 (ES). Score 0.5, Accuracy 87.5%, Points 50, Duration n/a.');
  });
});
