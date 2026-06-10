import type { Difficulty } from '../core/config';
import type { MetricsLanguageView, MetricsRangeView } from '../core/liveMetrics';
import {
  LEADERBOARD_RANGE_DEFINITIONS,
  LEADERBOARD_SECTION_DEFINITIONS,
  type LeaderboardRangeMetric,
  type LeaderboardSection,
  type LeaderboardSessionLength,
} from './leaderboardSections';

type LeaderboardSessionSource = {
  difficulty: Difficulty;
  dictationScript?: { estimatedDurationSec?: number | null } | null;
  metrics: {
    points: number;
    score: number;
    accuracy: number;
  };
  voiceDurationSec?: number | null;
};

type LeaderboardRangeSummary = {
  sessionsInRange: unknown[];
  durationSeconds: number;
  avgPoints: number | null;
  avgScore: number | null;
  avgAccuracy: number | null;
  avgWpm: number | null;
};

type LeaderboardSectionsBuilderDependencies<TSession extends LeaderboardSessionSource> = {
  resolveSessionLanguage: (session: TSession) => MetricsLanguageView | null;
  getSessionVoiceDurationSec: (session: TSession) => number | null;
  buildRangeSummaryForLanguage: (
    sessions: TSession[],
    language: MetricsLanguageView,
    range: MetricsRangeView,
  ) => LeaderboardRangeSummary;
  formatDuration: (durationSeconds: number) => string;
};

export function sortLeaderboardSessions<TSession extends LeaderboardSessionSource>(sessions: TSession[]): TSession[] {
  return [...sessions].sort(
    (a, b) => b.metrics.points - a.metrics.points || b.metrics.score - a.metrics.score || b.metrics.accuracy - a.metrics.accuracy,
  );
}

export function buildLeaderboardSections<TSession extends LeaderboardSessionSource>(
  sessions: TSession[],
  language: MetricsLanguageView,
  dependencies: LeaderboardSectionsBuilderDependencies<TSession>,
): Array<LeaderboardSection<TSession>> {
  const languageSessions = sortLeaderboardSessions(
    sessions.filter((session) => dependencies.resolveSessionLanguage(session) === language),
  );

  return LEADERBOARD_SECTION_DEFINITIONS.map((definition) => {
    const sectionSessions = languageSessions.filter((session) => {
      return (
        session.difficulty === definition.difficulty &&
        getLeaderboardSessionLength(session, dependencies.getSessionVoiceDurationSec) === definition.length
      );
    });

    return {
      ...definition,
      sessions: sectionSessions.map((session, index) => ({ rank: index + 1, session })),
      rangeMetrics: buildLeaderboardRangeMetrics(sectionSessions, language, dependencies),
    };
  });
}

function getLeaderboardSessionLength<TSession extends LeaderboardSessionSource>(
  session: TSession,
  getSessionVoiceDurationSec: (session: TSession) => number | null,
): LeaderboardSessionLength {
  const scriptDurationSec = session.dictationScript?.estimatedDurationSec;
  if (typeof scriptDurationSec === 'number' && Number.isFinite(scriptDurationSec) && scriptDurationSec > 0) {
    return scriptDurationSec <= 90 ? 'express' : 'standard';
  }

  const voiceDurationSec = typeof session.voiceDurationSec === 'number'
    ? session.voiceDurationSec
    : getSessionVoiceDurationSec(session);

  return typeof voiceDurationSec === 'number' && Number.isFinite(voiceDurationSec) && voiceDurationSec > 0 && voiceDurationSec <= 90
    ? 'express'
    : 'standard';
}

function buildLeaderboardRangeMetrics<TSession extends LeaderboardSessionSource>(
  sessions: TSession[],
  language: MetricsLanguageView,
  dependencies: LeaderboardSectionsBuilderDependencies<TSession>,
): LeaderboardRangeMetric[] {
  return LEADERBOARD_RANGE_DEFINITIONS.map(({ range, label }) => {
    const summary = dependencies.buildRangeSummaryForLanguage(sessions, language, range);

    return {
      range,
      label,
      sessionCount: summary.sessionsInRange.length,
      durationLabel: dependencies.formatDuration(summary.durationSeconds),
      avgPointsLabel: summary.avgPoints !== null ? summary.avgPoints.toFixed(1) : '-',
      avgScoreLabel: summary.avgScore !== null ? summary.avgScore.toFixed(1) : '-',
      avgAccuracyLabel: summary.avgAccuracy !== null ? `${summary.avgAccuracy.toFixed(1)}%` : '-',
      avgWpmLabel: summary.avgWpm !== null ? summary.avgWpm.toFixed(1) : '-',
    };
  });
}
