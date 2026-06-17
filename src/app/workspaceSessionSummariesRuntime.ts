import { useMemo } from 'react';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import { buildRangeSummaryForLanguage } from '../core/liveMetrics';
import type { StoredSession } from './sessionTypes';
import {
  appendVoiceDuration,
  buildAdminSessions,
  buildLeaderboard,
  buildLeaderboardMonthSessionCount,
  buildLatestSession,
  buildPendingSessions,
  buildPendingSyncSummary,
  buildRecentDictationSessionHints,
  buildSessionScoreHelpTextForLanguage,
  buildSessionSummaryRange,
  buildWorkspaceLeaderboardSections,
  findLastSessionSummaryForLanguage,
} from './workspaceSessionSummaryBuilders';
import { buildTrainingSessionSubmissionMeta } from './trainingSessionSubmissionMeta';
import { buildAdminStorageSummary } from './adminStorageSummary';

export interface UseWorkspaceSessionSummariesOptions {
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
  const latestSession = useMemo(() => buildLatestSession(sessions), [sessions]);

  const activeTrainingSubmissionMeta = useMemo(
    () => buildTrainingSessionSubmissionMeta(sessions, activeSession),
    [activeSession, sessions],
  );

  const pendingSessions = useMemo(() => buildPendingSessions(sessions), [sessions]);

  const pendingSyncSummary = useMemo(
    () => buildPendingSyncSummary({
      sessions,
      benchmarks: adaptiveBenchmarksByInputLanguage,
      feedback: adaptiveSessionFeedbackByInputLanguage,
      lastSyncedAt: supabaseLastSyncedAt,
    }),
    [sessions, adaptiveBenchmarksByInputLanguage, adaptiveSessionFeedbackByInputLanguage, supabaseLastSyncedAt],
  );

  const recentDictationSessionHints = useMemo(() => buildRecentDictationSessionHints(sessions), [sessions]);

  const sessionsWithVoiceDuration = useMemo(() => appendVoiceDuration(sessions), [sessions]);

  const leaderboard = useMemo(
    () => buildLeaderboard(sessionsWithVoiceDuration, leaderboardLanguageView),
    [sessionsWithVoiceDuration, leaderboardLanguageView],
  );

  const leaderboardSections = useMemo(
    () => buildWorkspaceLeaderboardSections(sessionsWithVoiceDuration, leaderboardLanguageView),
    [sessionsWithVoiceDuration, leaderboardLanguageView],
  );

  const adminSessions = useMemo(
    () => buildAdminSessions({
      adminProfileFilter,
      adminRemoteSessions,
      sessions,
      adminLanguageView,
    }),
    [adminProfileFilter, adminRemoteSessions, sessions, adminLanguageView],
  );

  const adminStorageSummary = useMemo(() => buildAdminStorageSummary(adminSessions), [adminSessions]);

  const lastSessionForLanguage = useMemo(
    () => findLastSessionSummaryForLanguage(sessionsWithVoiceDuration, metricsLanguageView),
    [sessionsWithVoiceDuration, metricsLanguageView],
  );

  const lastSessionScoreHelpText = useMemo(
    () => buildSessionScoreHelpTextForLanguage(lastSessionForLanguage?.id, sessions),
    [lastSessionForLanguage?.id, sessions],
  );

  const languageTodaySummary = useMemo(
    () => buildSessionSummaryRange(sessionsWithVoiceDuration, metricsLanguageView, metricsRangeView),
    [sessionsWithVoiceDuration, metricsLanguageView, metricsRangeView],
  );

  const leaderboardMonthSessionCount = useMemo(
    () => buildLeaderboardMonthSessionCount(sessionsWithVoiceDuration, leaderboardLanguageView),
    [sessionsWithVoiceDuration, leaderboardLanguageView],
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
    leaderboardMonthSessionCount,
    adminSessions,
    adminStorageSummary,
    lastSessionForLanguage,
    lastSessionScoreHelpText,
    languageTodaySummary,
  };
}
