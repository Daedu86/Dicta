import { describe, expect, it } from 'vitest';
import { formatLeaderboardSectionIntentLabel } from '../src/components/leaderboard/leaderboardViewHelpers';
import { buildLeaderboardSections } from '../src/app/leaderboardSectionsBuilder';

describe('LeaderboardWorkspace intent section labels', () => {
  it('maps canonical leaderboard section ids to listening-first intent labels', () => {
    expect(formatLeaderboardSectionIntentLabel({ id: 'precision', label: 'Precision' })).toBe('Precision');
    expect(formatLeaderboardSectionIntentLabel({ id: 'stabilize', label: 'Stabilize' })).toBe('Stabilize');
    expect(formatLeaderboardSectionIntentLabel({ id: 'challenge', label: 'Challenge' })).toBe('Challenge');
  });

  it('keeps unknown section labels unchanged for forward compatibility', () => {
    expect(formatLeaderboardSectionIntentLabel({ id: 'custom-section', label: 'Custom Section' })).toBe('Custom Section');
  });

  it('groups legacy express-duration and standard-duration sessions by canonical mode', () => {
    const sessions = [
      createSession({ id: 'express-precision', difficulty: 'easy', points: 12, estimatedDurationSec: 60 }),
      createSession({ id: 'standard-precision', difficulty: 'easy', points: 10, estimatedDurationSec: 120 }),
      createSession({ id: 'stabilize', difficulty: 'normal', points: 8, estimatedDurationSec: 60 }),
      createSession({ id: 'challenge', difficulty: 'hard', points: 6, estimatedDurationSec: 120 }),
    ];

    const sections = buildLeaderboardSections(sessions, 'de', {
      resolveSessionLanguage: (session) => session.language,
      buildRangeSummaryForLanguage: (rangeSessions) => ({
        sessionsInRange: rangeSessions,
        durationSeconds: rangeSessions.reduce((sum, session) => sum + session.estimatedDurationSec, 0),
        avgPoints: null,
        avgScore: null,
        avgAccuracy: null,
        avgWpm: null,
      }),
      formatDuration: (seconds) => `${seconds}s`,
    });

    expect(sections.map((section) => section.id)).toEqual(['precision', 'stabilize', 'challenge']);
    expect(sections.map((section) => section.sessions.length)).toEqual([2, 1, 1]);
    expect(sections[0].sessions.map(({ session }) => session.id)).toEqual(['express-precision', 'standard-precision']);
    expect(sections[0].rangeMetrics[0].durationLabel).toBe('180s');
  });
});

function createSession({
  id,
  difficulty,
  points,
  estimatedDurationSec,
}: {
  id: string;
  difficulty: 'easy' | 'normal' | 'hard';
  points: number;
  estimatedDurationSec: number;
}) {
  return {
    id,
    language: 'de' as const,
    difficulty,
    estimatedDurationSec,
    dictationScript: {
      estimatedDurationSec,
    },
    metrics: {
      points,
      score: points,
      accuracy: 90,
    },
  };
}
