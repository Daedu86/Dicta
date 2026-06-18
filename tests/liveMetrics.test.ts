import { describe, expect, it } from 'vitest';
import {
  buildRangeSummaryForLanguage,
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
  it('uses a rolling 30-day window for Month metrics', () => {
    const today = new Date('2026-06-18T15:34:00.000Z');

    const summary = buildRangeSummaryForLanguage(
      [
        makeSession('inside-first-rolling-day', '2026-05-19T16:31:26.471Z'),
        makeSession('outside-rolling-window', '2026-05-19T15:33:59.000Z'),
        makeSession('today-session', '2026-06-18T14:33:56.527Z'),
        makeSession('wrong-language', '2026-06-18T14:33:56.527Z', 'es'),
      ],
      'de',
      'month',
      today,
    );

    expect(summary.sessionsInRange.map((session) => session.id).sort()).toEqual([
      'inside-first-rolling-day',
      'today-session',
    ]);
  });
});
