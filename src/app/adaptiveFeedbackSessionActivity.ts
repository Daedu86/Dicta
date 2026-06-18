import type { InputLanguageBenchmarkMetrics, InputMode } from '../core/adaptive/types';
import type { StoredSession } from './sessionTypes';
import { SESSION_RETENTION_DAYS, SESSION_RETENTION_MS } from './sessionRetentionPolicy';

export const RECENT_ACTIVITY_WINDOW_DAYS = SESSION_RETENTION_DAYS;
export const RECENT_ACTIVITY_WINDOW_MS = SESSION_RETENTION_MS;

export type BenchmarkActivityScope = {
  language: string;
  nowMs: number;
  cutoffMs: number;
  languageSessions: StoredSession[];
  profileSessions: StoredSession[];
  recentLanguageSessions: StoredSession[];
  recentProfileSessions: StoredSession[];
  finishedRecentProfileSessions: StoredSession[];
};

export function buildBenchmarkActivityScope({
  sessions,
  inputMode,
  language,
}: {
  sessions: StoredSession[];
  inputMode: InputMode;
  language: string;
}): BenchmarkActivityScope {
  const nowMs = Date.now();
  const cutoffMs = nowMs - RECENT_ACTIVITY_WINDOW_MS;
  const languageSessions = sessions.filter((session) => resolveStoredSessionLanguage(session) === language);
  const profileSessions = languageSessions.filter((session) => mapSessionInputMode(session.inputMode) === inputMode);
  const recentLanguageSessions = languageSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const recentProfileSessions = profileSessions.filter((session) => isSessionUpdatedWithinWindow(session, cutoffMs, nowMs));
  const finishedRecentProfileSessions = recentProfileSessions.filter((session) => session.status === 'finished');

  return {
    language,
    nowMs,
    cutoffMs,
    languageSessions,
    profileSessions,
    recentLanguageSessions,
    recentProfileSessions,
    finishedRecentProfileSessions,
  };
}

export function buildRecentSessionsForInputLanguage(
  profileSessions: StoredSession[],
  profile: InputLanguageBenchmarkMetrics,
): Record<string, unknown>[] {
  return [...profileSessions]
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

export function averageSessionMetric(sessions: StoredSession[], metric: 'accuracy' | 'wpm'): number | null {
  const values = sessions
    .map((session) => session.metrics[metric])
    .filter((value): value is number => Number.isFinite(value) && value > 0);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
