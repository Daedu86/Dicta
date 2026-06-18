import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InputLanguageBenchmarkMetrics } from '../src/core/adaptive/types';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../src/core/sessionInputModes';
import {
  buildBenchmarkActivityScope,
  RECENT_ACTIVITY_WINDOW_DAYS,
} from '../src/app/adaptiveFeedbackSessionActivity';
import { buildBenchmarkActivitySummary } from '../src/app/adaptiveFeedbackContext';
import type { StoredSession } from '../src/app/sessionTypes';

const NOW_ISO = '2026-06-18T12:00:00.000Z';
const NOW_MS = Date.parse(NOW_ISO);

function daysAgo(days: number): string {
  return new Date(NOW_MS - days * 24 * 60 * 60 * 1000).toISOString();
}

function createSession(
  id: string,
  updatedAt: string,
  overrides: Partial<StoredSession> = {},
): StoredSession {
  return {
    id,
    name: id,
    createdAt: updatedAt,
    updatedAt,
    inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    inputSettingsLocked: true,
    ttsText: 'eins zwei drei',
    ttsLanguage: 'de',
    ttsPracticeText: 'eins zwei drei',
    difficulty: 'normal',
    status: 'finished',
    metrics: {
      controllerState: 'hold',
      rate: 1,
      lagSec: 0.5,
      lagWords: 1,
      wpm: 32,
      accuracy: 90,
      trend: 'stable',
      score: 3,
      points: 3,
    },
    telemetry: {
      startedAt: updatedAt,
      finishedAt: updatedAt,
      lagSeries: [],
      wpmSeries: [],
      accuracySeries: [],
      actions: [],
      ttsChunks: [],
      repeatCount: 0,
      rateDistribution: [],
    },
    sessionSource: 'plainText',
    generationOrigin: 'manual',
    createdDeviceKind: 'desktop',
    dictationScript: null,
    ...overrides,
  };
}

function createProfile(): InputLanguageBenchmarkMetrics {
  return {
    inputMode: 'browser-tts',
    language: 'de',
  } as InputLanguageBenchmarkMetrics;
}

describe('adaptive feedback session activity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_ISO));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses a 20-day recent activity window for input/language sessions', () => {
    const activity = buildBenchmarkActivityScope({
      sessions: [
        createSession('inside-19-days', daysAgo(19)),
        createSession('outside-21-days', daysAgo(21)),
        createSession('inside-other-language', daysAgo(19), { ttsLanguage: 'es' }),
      ],
      inputMode: 'browser-tts',
      language: 'de',
    });

    expect(RECENT_ACTIVITY_WINDOW_DAYS).toBe(20);
    expect(activity.recentProfileSessions.map((session) => session.id)).toEqual(['inside-19-days']);
    expect(activity.finishedRecentProfileSessions.map((session) => session.id)).toEqual(['inside-19-days']);
  });

  it('reports 20-day summary fields for adaptive feedback packages', () => {
    const summary = buildBenchmarkActivitySummary(
      [createSession('inside-19-days', daysAgo(19)), createSession('outside-21-days', daysAgo(21))],
      createProfile(),
    ) as {
      scope: { rangeDays: number };
      savedSessionCounts: Record<string, number>;
    };

    expect(summary.scope.rangeDays).toBe(20);
    expect(summary.savedSessionCounts.last20DaysForLanguage).toBe(1);
    expect(summary.savedSessionCounts.last20DaysForInputLanguage).toBe(1);
    expect(summary.savedSessionCounts.finishedLast20DaysForInputLanguage).toBe(1);
    expect(Object.keys(summary.savedSessionCounts).some((key) => key.includes('30'))).toBe(false);
  });

  it('derives recent counts from data without applying the observed daily count as a cap', () => {
    const observedDailyCount = 45;
    const sessions = Array.from({ length: observedDailyCount + 5 }, (_, index) =>
      createSession(`recent-${index}`, daysAgo(1)),
    );
    const summary = buildBenchmarkActivitySummary(sessions, createProfile()) as {
      savedSessionCounts: Record<string, number>;
    };

    expect(summary.savedSessionCounts.last20DaysForInputLanguage).toBe(observedDailyCount + 5);
  });
});
