import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import { estimateSessionVoiceDurationSec } from '../core/sessionDuration';
import { buildSessionScoreHelpText } from '../core/sessionScore';
import {
  buildRangeSummaryForLanguage,
  findLastSessionForLanguage,
  resolveSessionLanguage,
} from '../core/liveMetrics';
import { buildLeaderboardSections, sortLeaderboardSessions } from './leaderboardSectionsBuilder';
import { formatDuration } from './sessionPlaybackDuration';
import { isSessionReadyForTraining } from './sessionTrainingReadiness';
import type { StoredSession } from './sessionTypes';
import { countLocalChangesPendingSync } from './supabaseSyncPresentation';

export type SessionWithVoiceDuration = StoredSession & {
  voiceDurationSec: number;
};

export function buildLatestSession(sessions: StoredSession[]): StoredSession | null {
  if (sessions.length === 0) return null;
  return sortSessionsByUpdatedAtDesc(sessions)[0];
}

export function buildPendingSessions(sessions: StoredSession[]): StoredSession[] {
  return sortSessionsByUpdatedAtDesc(
    sessions.filter((session) => session.status !== 'error' && !isSessionReadyForTraining(session)),
  );
}

export function buildPendingSyncSummary(options: {
  sessions: StoredSession[];
  benchmarks: AdaptiveBenchmarksByInputLanguage;
  feedback: AdaptiveSessionFeedbackByInputLanguage;
  lastSyncedAt: string | null;
}) {
  return countLocalChangesPendingSync(options);
}

export function buildRecentDictationSessionHints(sessions: StoredSession[]) {
  return sessions
    .filter((session) => session.sessionSource === 'dictationScript' && Boolean(session.dictationScript))
    .slice(0, 5)
    .map((session) => {
      const script = session.dictationScript;
      const opener = script?.phrases?.[0]?.text?.trim() ?? '';
      return {
        title: script?.title?.trim() || session.name.trim(),
        opener,
      };
    });
}

export function appendVoiceDuration(sessions: StoredSession[]): SessionWithVoiceDuration[] {
  return sessions.map((session) => ({
    ...session,
    voiceDurationSec: estimateSessionVoiceDurationSec(session),
  }));
}

export function buildLeaderboard(
  sessionsWithVoiceDuration: SessionWithVoiceDuration[],
  leaderboardLanguageView: BenchmarkLanguageButton,
) {
  return sortLeaderboardSessions(
    sessionsWithVoiceDuration.filter((session) => resolveSessionLanguage(session) === leaderboardLanguageView),
  ).map((session, index) => ({ rank: index + 1, session }));
}

export function buildWorkspaceLeaderboardSections(
  sessionsWithVoiceDuration: SessionWithVoiceDuration[],
  leaderboardLanguageView: BenchmarkLanguageButton,
) {
  return buildLeaderboardSections(sessionsWithVoiceDuration, leaderboardLanguageView, {
    resolveSessionLanguage,
    buildRangeSummaryForLanguage,
    formatDuration,
  });
}

export function buildAdminSessions({
  adminProfileFilter,
  adminRemoteSessions,
  sessions,
  adminLanguageView,
}: {
  adminProfileFilter: string;
  adminRemoteSessions: StoredSession[];
  sessions: StoredSession[];
  adminLanguageView: BenchmarkLanguageButton;
}): StoredSession[] {
  const source = adminProfileFilter === 'self' ? sessions : adminRemoteSessions;
  return source.filter((session) => resolveSessionLanguage(session) === adminLanguageView);
}

export function findLastSessionSummaryForLanguage(
  sessionsWithVoiceDuration: SessionWithVoiceDuration[],
  metricsLanguageView: BenchmarkLanguageButton,
) {
  return findLastSessionForLanguage(sessionsWithVoiceDuration, metricsLanguageView);
}

export function buildSessionScoreHelpTextForLanguage(
  lastSessionId: string | undefined,
  sessions: StoredSession[],
): string | undefined {
  if (!lastSessionId) return undefined;
  const fullSession = sessions.find((session) => session.id === lastSessionId);
  return fullSession ? buildSessionScoreHelpText(fullSession.metrics) : undefined;
}

export function buildSessionSummaryRange(
  sessionsWithVoiceDuration: SessionWithVoiceDuration[],
  metricsLanguageView: BenchmarkLanguageButton,
  metricsRangeView: Parameters<typeof buildRangeSummaryForLanguage>[2],
) {
  return buildRangeSummaryForLanguage(sessionsWithVoiceDuration, metricsLanguageView, metricsRangeView);
}

export function buildLeaderboardMonthSessionCount(
  sessionsWithVoiceDuration: SessionWithVoiceDuration[],
  leaderboardLanguageView: BenchmarkLanguageButton,
): number {
  return buildRangeSummaryForLanguage(sessionsWithVoiceDuration, leaderboardLanguageView, 'month').sessionsInRange.length;
}

function sortSessionsByUpdatedAtDesc<TSession extends StoredSession>(sessions: TSession[]): TSession[] {
  return [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
