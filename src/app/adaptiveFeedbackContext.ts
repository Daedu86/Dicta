import type { InputLanguageBenchmarkMetrics, InputMode } from '../core/adaptive/types';
import type { SessionFeedbackReference } from '../core/adaptive/sessionFeedback';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import type { StoredSession } from './sessionTypes';
import {
  averageSessionMetric,
  buildBenchmarkActivityScope,
  buildRecentSessionsForInputLanguage,
  findLatestFinishedSessionForProfile,
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
  const avgAccuracy = averageSessionMetric(activity.finishedMonthProfileSessions, 'accuracy');
  const avgWpm = averageSessionMetric(activity.finishedMonthProfileSessions, 'wpm');
  const hints = [
    `User activity context: ${activity.monthLanguageSessions.length} ${language.toUpperCase()} session(s) in the last 30 days; ${activity.monthProfileSessions.length} match ${inputMode}/${language}.`,
  ];

  if (benchmarkSessionCount !== activity.monthProfileSessions.length) {
    hints.push(
      `Adaptive benchmark sessionCount is ${benchmarkSessionCount} because it counts accepted ${inputMode}/${language} telemetry samples, not every saved monthly session.`,
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
  const averageAccuracy = averageSessionMetric(activity.finishedMonthProfileSessions, 'accuracy');
  const averageWpm = averageSessionMetric(activity.finishedMonthProfileSessions, 'wpm');

  return {
    scope: {
      inputMode: profile.inputMode,
      language: activity.language,
      rangeDays: 30,
    },
    savedSessionCounts: {
      allTimeForLanguage: activity.languageSessions.length,
      allTimeForInputLanguage: activity.profileSessions.length,
      last30DaysForLanguage: activity.monthLanguageSessions.length,
      last30DaysForInputLanguage: activity.monthProfileSessions.length,
      finishedLast30DaysForInputLanguage: activity.finishedMonthProfileSessions.length,
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
