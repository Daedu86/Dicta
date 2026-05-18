import { describe, expect, it } from 'vitest';
import { formatLeaderboardSubmissionMessage, rankSessionForLeaderboard, type LeaderboardRankSession } from '../src/core/leaderboard';

const session = (
  id: string,
  points: number,
  score: number,
  accuracy: number,
  language: 'en' | 'es' | 'de' | 'fr' = 'de',
): LeaderboardRankSession => ({
  id,
  inputMode: 'input2',
  transcriptionLanguage: null,
  ttsLanguage: language,
  kokoroLanguage: null,
  metrics: { points, score, accuracy },
});

describe('leaderboard ranking', () => {
  it('ranks the submitted session in its own language leaderboard', () => {
    const rank = rankSessionForLeaderboard(
      [
        session('de-1', 80, 80, 90, 'de'),
        session('fr-1', 999, 999, 100, 'fr'),
        session('de-2', 120, 120, 88, 'de'),
        session('de-3', 80, 90, 91, 'de'),
      ],
      'de-1',
    );

    expect(rank).toEqual({ rank: 3, total: 3, language: 'de' });
    expect(formatLeaderboardSubmissionMessage(rank)).toBe('Submitted to the leaderboard. You landed at position #3 of 3 for DE.');
  });
});
