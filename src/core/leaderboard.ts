import { resolveSessionLanguage, type MetricsLanguageView, type SessionLanguageLike } from './liveMetrics';

export type LeaderboardRankSession = SessionLanguageLike & {
  id: string;
  metrics: {
    points: number;
    score: number;
    accuracy: number;
  };
};

export type LeaderboardRank = {
  rank: number;
  total: number;
  language: MetricsLanguageView;
};

export function rankSessionForLeaderboard(sessions: LeaderboardRankSession[], sessionId: string): LeaderboardRank | null {
  const currentSession = sessions.find((session) => session.id === sessionId);
  if (!currentSession) return null;
  const language = resolveSessionLanguage(currentSession);
  if (!language) return null;

  const ranked = [...sessions]
    .filter((session) => resolveSessionLanguage(session) === language)
    .sort((a, b) => b.metrics.points - a.metrics.points || b.metrics.score - a.metrics.score || b.metrics.accuracy - a.metrics.accuracy);
  const index = ranked.findIndex((session) => session.id === sessionId);
  if (index < 0) return null;
  return {
    rank: index + 1,
    total: ranked.length,
    language,
  };
}

export function formatLeaderboardSubmissionMessage(rank: LeaderboardRank | null): string {
  if (!rank) return 'Submitted to the leaderboard. Typing is locked until reset.';
  return `Submitted to the leaderboard. You landed at position #${rank.rank} of ${rank.total} for ${rank.language.toUpperCase()}.`;
}
