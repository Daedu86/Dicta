import type {
  InputLanguageBenchmarkMetrics,
  InputMode,
} from '../core/adaptive/types';
import type { SessionFeedbackReference } from '../core/adaptive/sessionFeedback';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import type { StoredSession } from './sessionTypes';

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
  const nowMs = Date.now();
  const cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  const languageSessions = sessions.filter((session) => resolveStoredSessionLanguage(session) === language);
  const profileSessions = languageSessions.filter((session) => mapSessionInputMode(session.inputMode) === inputMode);
  const monthLanguageSessions = languageSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const monthProfileSessions = profileSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const finishedMonthProfileSessions = monthProfileSessions.filter((session) => session.status === 'finished');
  const avgAccuracy = averageSessionMetric(finishedMonthProfileSessions, 'accuracy');
  const avgWpm = averageSessionMetric(finishedMonthProfileSessions, 'wpm');
  const hints = [
    `User activity context: ${monthLanguageSessions.length} ${language.toUpperCase()} session(s) in the last 30 days; ${monthProfileSessions.length} match ${inputMode}/${language}.`,
  ];

  if (benchmarkSessionCount !== monthProfileSessions.length) {
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
  const language = String(profile.language);
  const nowMs = Date.now();
  const cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  const languageSessions = sessions.filter((session) => resolveStoredSessionLanguage(session) === language);
  const profileSessions = languageSessions.filter((session) => mapSessionInputMode(session.inputMode) === profile.inputMode);
  const monthLanguageSessions = languageSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const monthProfileSessions = profileSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const finishedMonthProfileSessions = monthProfileSessions.filter((session) => session.status === 'finished');
  const averageAccuracy = averageSessionMetric(finishedMonthProfileSessions, 'accuracy');
  const averageWpm = averageSessionMetric(finishedMonthProfileSessions, 'wpm');
  const recentSessionsForInputLanguage = [...profileSessions]
    .sort((a, b) => getSessionUpdatedAtMs(b) - getSessionUpdatedAtMs(a))
    .slice(0, 5)
    .map((session) => ({
      id: session.id,
      name: session.name,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      sessionSource: session.sessionSource,
      generationOrigin: session.generationOrigin,
      difficulty: session.difficulty,
      ...(profile.inputMode === 'browser-tts' && session.ttsEnvironment ? { ttsEnvironment: session.ttsEnvironment } : {}),
      dictationScript: session.dictationScript
        ? {
            title: session.dictationScript.title,
            difficulty: session.dictationScript.difficulty,
            estimatedDurationSec: session.dictationScript.estimatedDurationSec,
            phraseCount: session.dictationScript.phrases.length,
          }
        : null,
      metrics: {
        accuracy: session.metrics.accuracy,
        wpm: session.metrics.wpm,
        lagSec: session.metrics.lagSec,
        rate: session.metrics.rate,
        score: session.metrics.score,
        points: session.metrics.points,
        trend: session.metrics.trend,
      },
      telemetry: {
        lagSamples: session.telemetry.lagSeries.length,
        wpmSamples: session.telemetry.wpmSeries.length,
        accuracySamples: session.telemetry.accuracySeries.length,
        actionCount: session.telemetry.actions.length,
        ttsChunkCount: session.telemetry.ttsChunks.length,
        repeatCount: session.telemetry.repeatCount,
        rateDistributionBuckets: session.telemetry.rateDistribution.length,
        startedAt: session.telemetry.startedAt,
        finishedAt: session.telemetry.finishedAt ?? null,
      },
    }));

  return {
    scope: {
      inputMode: profile.inputMode,
      language,
      rangeDays: 30,
    },
    savedSessionCounts: {
      allTimeForLanguage: languageSessions.length,
      allTimeForInputLanguage: profileSessions.length,
      last30DaysForLanguage: monthLanguageSessions.length,
      last30DaysForInputLanguage: monthProfileSessions.length,
      finishedLast30DaysForInputLanguage: finishedMonthProfileSessions.length,
    },
    recentFinishedAverages:
      averageAccuracy === null && averageWpm === null
        ? null
        : {
            accuracy: averageAccuracy,
            wpm: averageWpm,
          },
    recentSessionsForInputLanguage,
    benchmarkCountExplanation:
      `benchmarkProfile.sessionCount (${profile.sessionCount}) counts unique sessions represented by accepted adaptive telemetry samples for ${profile.inputMode}/${language}; ` +
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

export function findLatestFinishedSessionForProfile(
  sessions: StoredSession[],
  profile: InputLanguageBenchmarkMetrics,
): StoredSession | null {
  const language = String(profile.language);
  return sessions
    .filter((session) => session.status === 'finished')
    .filter((session) => resolveStoredSessionLanguage(session) === language)
    .filter((session) => mapSessionInputMode(session.inputMode) === profile.inputMode)
    .sort((a, b) => getSessionFinishedAtMs(b) - getSessionFinishedAtMs(a))[0] ?? null;
}

function resolveStoredSessionLanguage(session: StoredSession): string {
  return session.ttsLanguage ?? 'unknown';
}

function mapSessionInputMode(mode: string): InputMode {
  return mode === 'browser-tts' ? 'browser-tts' : 'browser-tts';
}

function getSessionFinishedAtMs(session: StoredSession): number {
  const finishedAtMs = new Date(session.telemetry.finishedAt ?? session.updatedAt ?? session.createdAt).getTime();
  return Number.isFinite(finishedAtMs) ? finishedAtMs : 0;
}

function getSessionUpdatedAtMs(session: StoredSession): number {
  const updatedAtMs = new Date(session.updatedAt || session.createdAt).getTime();
  return Number.isFinite(updatedAtMs) ? updatedAtMs : 0;
}

function isSessionUpdatedWithinWindow(session: StoredSession, cutoffMs: number, nowMs: number): boolean {
  const updatedAtMs = getSessionUpdatedAtMs(session);
  return Number.isFinite(updatedAtMs) && updatedAtMs >= cutoffMs && updatedAtMs <= nowMs;
}

function averageSessionMetric(sessions: StoredSession[], metric: 'accuracy' | 'wpm'): number | null {
  const values = sessions
    .map((session) => session.metrics[metric])
    .filter((value): value is number => Number.isFinite(value) && value > 0);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
