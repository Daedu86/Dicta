import { describe, expect, it } from 'vitest';
import {
  buildRangeSummaryForLanguage,
  rangeLabel,
  type SessionForMetrics,
} from '../src/core/liveMetrics';

function makeSession(id: string, updatedAt: string, ttsLanguage: SessionForMetrics['ttsLanguage'] = 'de'): SessionForMetrics {
  return {
    id,
    name: id,
    inputMode: 'input2',
    ttsLanguage,
    updatedAt,
    voiceDurationSec: 60,
    metrics: {
      points: 1,
      score: 1,
      accuracy: 100,
      wpm: 10,
    },
    telemetry: {
      startedAt: updatedAt,
      finishedAt: updatedAt,
    },
  };
}

describe('buildRangeSummaryForLanguage', () => {
  it('uses a rolling 10-day window for mid-range metrics', () => {
    const today = new Date('2026-06-18T15:34:00.000Z');

    const summary = buildRangeSummaryForLanguage(
      [
        makeSession('inside-ten-days', '2026-06-08T16:31:26.471Z'),
        makeSession('outside-ten-days', '2026-06-08T15:33:59.000Z'),
        makeSession('today-session', '2026-06-18T14:33:56.527Z'),
      ],
      'de',
      'tenDays',
      today,
    );

    expect(summary.sessionsInRange.map((session) => session.id).sort()).toEqual([
      'inside-ten-days',
      'today-session',
    ]);
  });

  it('uses a rolling 20-day window for recent metrics', () => {
    const today = new Date('2026-06-18T15:34:00.000Z');

    const summary = buildRangeSummaryForLanguage(
      [
        makeSession('inside-first-rolling-day', '2026-05-29T16:31:26.471Z'),
        makeSession('outside-rolling-window', '2026-05-29T15:33:59.000Z'),
        makeSession('today-session', '2026-06-18T14:33:56.527Z'),
        makeSession('wrong-language', '2026-06-18T14:33:56.527Z', 'es'),
      ],
      'de',
      'twentyDays',
      today,
    );

    expect(summary.sessionsInRange.map((session) => session.id).sort()).toEqual([
      'inside-first-rolling-day',
      'today-session',
    ]);
  });

  it('labels the current and compatibility 20-day ranges consistently', () => {
    expect(rangeLabel('twentyDays')).toBe('20 days');
    expect(rangeLabel('month')).toBe('20 days');
  });
});
