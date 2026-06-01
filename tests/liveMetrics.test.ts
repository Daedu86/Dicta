import { describe, expect, it } from 'vitest';
import {
  buildRangeSummaryForLanguage,
  findLastSessionForLanguage,
  rangeLabel,
  resolveSessionLanguage,
  type SessionForMetrics,
} from '../src/core/liveMetrics';

function session(overrides: Partial<SessionForMetrics>): SessionForMetrics {
  return {
    inputMode: 'input1',
    transcriptionLanguage: 'de',
    ttsLanguage: null,
    kokoroLanguage: null,
    updatedAt: '2026-04-28T10:00:00.000Z',
    metrics: { points: 10, score: 20, accuracy: 90, wpm: 50 },
    telemetry: { startedAt: '2026-04-28T09:55:00.000Z', finishedAt: '2026-04-28T10:00:00.000Z' },
    ...overrides,
  };
}

describe('resolveSessionLanguage', () => {
  it('uses transcription language for input1', () => {
    expect(resolveSessionLanguage(session({ inputMode: 'input1', transcriptionLanguage: 'de' }))).toBe('de');
  });

  it('uses tts language for input2 and input4', () => {
    expect(resolveSessionLanguage(session({ inputMode: 'input2', ttsLanguage: 'es' }))).toBe('es');
    expect(resolveSessionLanguage(session({ inputMode: 'input4', ttsLanguage: 'en' }))).toBe('en');
    expect(resolveSessionLanguage(session({ inputMode: 'input4', ttsLanguage: 'pt' }))).toBe('pt');
  });

  it('uses kokoro language for input3', () => {
    expect(resolveSessionLanguage(session({ inputMode: 'input3', kokoroLanguage: 'en' }))).toBe('en');
    expect(resolveSessionLanguage(session({ inputMode: 'input3', kokoroLanguage: 'pt' }))).toBe('pt');
  });

  it('returns null for missing language', () => {
    expect(resolveSessionLanguage(session({ inputMode: 'input2', ttsLanguage: null }))).toBeNull();
  });
});

describe('language metrics aggregation', () => {
  it('selects latest session for language by updatedAt', () => {
    const sessions = [
      session({ inputMode: 'input2', ttsLanguage: 'es', updatedAt: '2026-04-27T10:00:00.000Z' }),
      session({ inputMode: 'input1', transcriptionLanguage: 'es', updatedAt: '2026-04-28T10:00:00.000Z' }),
      session({ inputMode: 'input3', kokoroLanguage: 'en', updatedAt: '2026-04-29T10:00:00.000Z' }),
    ];
    const lastEs = findLastSessionForLanguage(sessions, 'es');
    expect(lastEs?.updatedAt).toBe('2026-04-28T10:00:00.000Z');
  });

  it('aggregates only selected language sessions for today', () => {
    const today = new Date('2026-04-28T12:00:00.000Z');
    const sessions = [
      session({ inputMode: 'input1', transcriptionLanguage: 'de', updatedAt: '2026-04-28T09:00:00.000Z', metrics: { points: 10, score: 20, accuracy: 80, wpm: 40 } }),
      session({ inputMode: 'input2', ttsLanguage: 'de', updatedAt: '2026-04-28T11:00:00.000Z', metrics: { points: 30, score: 40, accuracy: 100, wpm: 60 } }),
      session({ inputMode: 'input2', ttsLanguage: 'es', updatedAt: '2026-04-28T11:30:00.000Z', metrics: { points: 99, score: 99, accuracy: 99, wpm: 99 } }),
      session({ inputMode: 'input3', kokoroLanguage: 'de', updatedAt: '2026-04-27T11:30:00.000Z', metrics: { points: 100, score: 100, accuracy: 100, wpm: 100 } }),
    ];

    const summary = buildRangeSummaryForLanguage(sessions, 'de', 'today', today);
    expect(summary.sessionsInRange).toHaveLength(2);
    expect(summary.avgPoints).toBe(20);
    expect(summary.avgScore).toBe(30);
    expect(summary.avgAccuracy).toBe(90);
    expect(summary.avgWpm).toBe(50);
    expect(summary.durationSeconds).toBe(600);
    expect(summary.days).toHaveLength(1);
  });

  it('uses voice duration when sessions provide it', () => {
    const today = new Date('2026-04-28T12:00:00.000Z');
    const sessions = [
      session({ inputMode: 'input2', ttsLanguage: 'de', updatedAt: '2026-04-28T09:00:00.000Z', voiceDurationSec: 20 }),
      session({ inputMode: 'input3', kokoroLanguage: 'de', updatedAt: '2026-04-28T10:00:00.000Z', voiceDurationSec: 35 }),
    ];

    const summary = buildRangeSummaryForLanguage(sessions, 'de', 'today', today);
    expect(summary.durationSeconds).toBe(55);
  });

  it('supports rolling windows for week/2w/3w/month', () => {
    const today = new Date('2026-04-30T12:00:00.000Z');
    const sessions = [
      session({ inputMode: 'input2', ttsLanguage: 'en', updatedAt: '2026-04-30T10:00:00.000Z' }),
      session({ inputMode: 'input2', ttsLanguage: 'en', updatedAt: '2026-04-24T10:00:00.000Z' }),
      session({ inputMode: 'input2', ttsLanguage: 'en', updatedAt: '2026-04-18T10:00:00.000Z' }),
      session({ inputMode: 'input2', ttsLanguage: 'en', updatedAt: '2026-04-10T10:00:00.000Z' }),
      session({ inputMode: 'input2', ttsLanguage: 'en', updatedAt: '2026-03-20T10:00:00.000Z' }),
    ];

    expect(buildRangeSummaryForLanguage(sessions, 'en', 'week', today).sessionsInRange).toHaveLength(2);
    expect(buildRangeSummaryForLanguage(sessions, 'en', 'twoWeeks', today).sessionsInRange).toHaveLength(3);
    expect(buildRangeSummaryForLanguage(sessions, 'en', 'threeWeeks', today).sessionsInRange).toHaveLength(4);
    expect(buildRangeSummaryForLanguage(sessions, 'en', 'month', today).sessionsInRange).toHaveLength(4);
    expect(buildRangeSummaryForLanguage(sessions, 'en', 'month', today).days).toHaveLength(30);
  });

  it('provides range labels', () => {
    expect(rangeLabel('today')).toBe('Today');
    expect(rangeLabel('week')).toBe('Week');
    expect(rangeLabel('twoWeeks')).toBe('2 Weeks');
    expect(rangeLabel('threeWeeks')).toBe('3 Weeks');
    expect(rangeLabel('month')).toBe('Month');
  });
});
