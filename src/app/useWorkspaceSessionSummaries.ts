import { useMemo } from 'react';
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
import { buildAdminStorageSummary } from './adminStorageSummary';
import { buildLeaderboardSections, sortLeaderboardSessions } from './leaderboardSectionsBuilder';
import { formatDuration } from './sessionPlaybackDuration';
import { isSessionReadyForTraining } from './sessionTrainingReadiness';
import type { StoredSession } from './sessionTypes';
import { buildTrainingSessionSubmissionMeta } from './trainingSessionSubmissionMeta';
import { countLocalChangesPendingSync } from './supabaseSyncPresentation';

interface UseWorkspaceSessionSummariesOptions {
  sessions: StoredSession[];
  activeSession: StoredSession | null;
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  supabaseLastSyncedAt: string | null;
  leaderboardLanguageView: BenchmarkLanguageButton;
  adminLanguageView: BenchmarkLanguageButton;
  adminProfileFilter: string;
  adminRemoteSessions: StoredSession[];
  metricsLanguageView: BenchmarkLanguageButton;
  metricsRangeView: Parameters<typeof buildRangeSummaryForLanguage>[2];
}

export function useWorkspaceSessionSummaries({
  sessions,
  activeSession,
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  supabaseLastSyncedAt,
  leaderboardLanguageView,
  adminLanguageView,
  adminProfileFilter,
  adminRemoteSessions,
  metricsLanguageView,
  metricsRangeView,
}: UseWorkspaceSessionSummariesOptions) {
  const latestSession = useMemo<StoredSession | null>(() => {
    if (sessions.length === 0) return null;
    return [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }, [sessions]);

  const activeTrainingSubmissionMeta = useMemo(
    () => buildTrainingSessionSubmissionMeta(sessions, activeSession),
    [activeSession, sessions],
  );

  const pendingSessions = useMemo(
    () =>
      [...sessions]
        .filter((session) => session.status !== 'error' && !isSessionReadyForTraining(session))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [sessions],
  );

  const pendingSyncSummary = useMemo(
    () =>
      countLocalChangesPendingSync({
        sessions,
        benchmarks: adaptiveBenchmarksByInputLanguage,
        feedback: adaptiveSessionFeedbackByInputLanguage,
        lastSyncedAt: supabaseLastSyncedAt,
      }),
    [sessions, adaptiveBenchmarksByInputLanguage, adaptiveSessionFeedbackByInputLanguage, supabaseLastSyncedAt],
  );

  const recentDictationSessionHints = useMemo(() => {
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
  }, [sessions]);

  const sessionsWithVoiceDuration = useMemo(
    () => sessions.map((session) => ({ ...session, voiceDurationSec: estimateSessionVoiceDurationSec(session) })),
    [sessions],
  );

  const leaderboard = useMemo(
    () =>
      sortLeaderboardSessions(
        sessionsWithVoiceDuration
          .filter((session) => resolveSessionLanguage(session) === leaderboardLanguageView),
      )
        .map((session, index) => ({ rank: index + 1, session })),
    [sessionsWithVoiceDuration, leaderboardLanguageView],
  );

  const leaderboardSections = useMemo(
    () =>
      buildLeaderboardSections(sessionsWithVoiceDuration, leaderboardLanguageView, {
        resolveSessionLanguage,
        buildRangeSummaryForLanguage,
        formatDuration,
      }),
    [sessionsWithVoiceDuration, leaderboardLanguageView],
  );

  const adminSessions = useMemo(
    () => {
      const source = adminProfileFilter === 'self' ? sessions : adminRemoteSessions;
      return [...source].filter((session) => resolveSessionLanguage(session) === adminLanguageView);
    },
    [adminProfileFilter, adminRemoteSessions, sessions, adminLanguageView],
  );

  const adminStorageSummary = useMemo(() => buildAdminStorageSummary(adminSessions), [adminSessions]);

  const lastSessionForLanguage = useMemo(
    () => findLastSessionForLanguage(sessionsWithVoiceDuration, metricsLanguageView),
    [sessionsWithVoiceDuration, metricsLanguageView],
  );

  const lastSessionScoreHelpText = useMemo(() => {
    if (!lastSessionForLanguage?.id) return undefined;
    const fullSession = sessions.find((session) => session.id === lastSessionForLanguage.id);
    return fullSession ? buildSessionScoreHelpText(fullSession.metrics) : undefined;
  }, [lastSessionForLanguage?.id, sessions]);

  const languageTodaySummary = useMemo(
    () => buildRangeSummaryForLanguage(sessionsWithVoiceDuration, metricsLanguageView, metricsRangeView),
    [sessionsWithVoiceDuration, metricsLanguageView, metricsRangeView],
  );

  return {
    latestSession,
    activeTrainingSubmissionMeta,
    pendingSessions,
    pendingSyncSummary,
    recentDictationSessionHints,
    sessionsWithVoiceDuration,
    leaderboard,
    leaderboardSections,
    adminSessions,
    adminStorageSummary,
    lastSessionForLanguage,
    lastSessionScoreHelpText,
    languageTodaySummary,
  };
}
