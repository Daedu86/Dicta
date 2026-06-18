import type { InputLanguageBenchmarkMetrics, InputMode } from '../core/adaptive/types';
import type { SessionFeedbackReference } from '../core/adaptive/sessionFeedback';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import type { StoredSession } from './sessionTypes';
import {
  averageSessionMetric,
  buildBenchmarkActivityScope,
  buildRecentSessionsForInputLanguage,
  findLatestFinishedSessionForProfile,
  RECENT_ACTIVITY_WINDOW_DAYS,
} from './adaptiveFeedbackSessionActivity';

export { findLatestFinishedSessionForProfile } from './adaptiveFeedbackSessionActivity';

export function buildOpenRouterActivityHints({
  sessions,
  inputMode,
  language,
  benchmarkSessionCount,
}: {
  sessions: StoredSession[];
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  benchmarkSessionCount: number;
}): string[] {
  const activity = buildBenchmarkActivityScope({ sessions, inputMode, language });
  const avgAccuracy = averageSessionMetric(activity.finishedRecentProfileSessions, 'accuracy');
  const avgWpm = averageSessionMetric(activity.finishedRecentProfileSessions, 'wpm');
  const hints = [
    `User activity context: ${activity.recentLanguageSessions.length} ${language.toUpperCase()} session(s) in the last ${RECENT_ACTIVITY_WINDOW_DAYS} days; ${activity.recentProfileSessions.length} match ${inputMode}/${language}.`,
  ];

  if (benchmarkSessionCount !== activity.recentProfileSessions.length) {
    hints.push(
      `Adaptive benchmark sessionCount is ${benchmarkSessionCount} because it counts accepted ${inputMode}/${language} telemetry samples, not every saved recent session.`,
    );
  }
  if (avgAccuracy !== null || avgWpm !== null) {
    hints.push(
      `Recent finished ${inputMode}/${language} activity averages: ${avgAccuracy === null ? 'accuracy unavailable' : `${avgAccuracy.toFixed(1)}% accuracy`}, ${avgWpm === null ? 'WPM unavailable' : `${avgWpm.toFixed(1)} WPM`}.`,
    );
  }
  return hints;
}

export function buildBenchmarkActivitySummary(sessions: StoredSession[], profile: InputLanguageBenchmarkMetrics): Record<string, unknown> {
  const activity = buildBenchmarkActivityScope({
    sessions,
    inputMode: profile.inputMode,
    language: String(profile.language),
  });
  const averageAccuracy = averageSessionMetric(activity.finishedRecentProfileSessions, 'accuracy');
  const averageWpm = averageSessionMetric(activity.finishedRecentProfileSessions, 'wpm');

  return {
    scope: {
      inputMode: profile.inputMode,
      language: activity.language,
      rangeDays: RECENT_ACTIVITY_WINDOW_DAYS,
    },
    savedSessionCounts: {
      allTimeForLanguage: activity.languageSessions.length,
      allTimeForInputLanguage: activity.profileSessions.length,
      last20DaysForLanguage: activity.recentLanguageSessions.length,
      last20DaysForInputLanguage: activity.recentProfileSessions.length,
      finishedLast20DaysForInputLanguage: activity.finishedRecentProfileSessions.length,
    },
    recentFinishedAverages:
      averageAccuracy === null && averageWpm === null
        ? null
        : {
            accuracy: averageAccuracy,
            wpm: averageWpm,
          },
    recentSessionsForInputLanguage: buildRecentSessionsForInputLanguage(activity.profileSessions, profile),
    benchmarkCountExplanation:
      `benchmarkProfile.sessionCount (${profile.sessionCount}) counts unique sessions represented by accepted adaptive telemetry samples for ${profile.inputMode}/${activity.language}; ` +
      `it is expected to be lower than savedSessionCounts when sessions have no accepted benchmark samples or belong to another input mode.`,
  };
}

export function buildLatestFinishedSessionFeedbackReference(
  sessions: StoredSession[],
  profile: InputLanguageBenchmarkMetrics,
): SessionFeedbackReference | null {
  const latestSession = findLatestFinishedSessionForProfile(sessions, profile);
  if (!latestSession) return null;
  return {
    sessionId: latestSession.id,
    createdAt: latestSession.createdAt,
    updatedAt: latestSession.updatedAt,
    finishedAt: latestSession.telemetry.finishedAt ?? latestSession.updatedAt,
    completedAt: latestSession.telemetry.finishedAt ?? latestSession.updatedAt,
    scriptId: latestSession.dictationScript ? `${latestSession.id}:${latestSession.dictationScript.title}` : undefined,
    scriptTitle: latestSession.dictationScript?.title ?? latestSession.name,
  };
}
