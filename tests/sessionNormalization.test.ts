import { describe, expect, it } from 'vitest';
import {
  cloneTelemetry,
  hasFinalizedAttemptTelemetry,
  isSubmittedFinishedAttempt,
  normalizeRateDistribution,
  normalizeSessionForPersistence,
} from '../src/core/sessionNormalization';

describe('sessionNormalization', () => {
  it('preserves French and Portuguese for the active input language only', () => {
    expect(
      normalizeSessionForPersistence({
        inputMode: 'input2' as const,
        ttsLanguage: 'fr' as const,
        kokoroLanguage: 'es' as const,
        telemetry: {},
      }).ttsLanguage,
    ).toBe('fr');
    expect(
      normalizeSessionForPersistence({
        inputMode: 'input3' as const,
        ttsLanguage: 'es' as const,
        kokoroLanguage: 'fr' as const,
        telemetry: {},
      }).kokoroLanguage,
    ).toBe('fr');
    expect(
      normalizeSessionForPersistence({
        inputMode: 'input4' as const,
        ttsLanguage: 'pt' as const,
        kokoroLanguage: 'fr' as const,
        telemetry: {},
      }).ttsLanguage,
    ).toBe('pt');
  });

  it('input2 only keeps ttsLanguage', () => {
    const session = {
      inputMode: 'input2' as const,
      ttsLanguage: 'es' as const,
      kokoroLanguage: 'en' as const,
      telemetry: {},
    };

    const normalized = normalizeSessionForPersistence(session);
    expect(normalized.ttsLanguage).toBe('es');
    expect(normalized.kokoroLanguage).toBeNull();
  });

  it('input3 only keeps kokoroLanguage', () => {
    const session = {
      inputMode: 'input3' as const,
      ttsLanguage: 'es' as const,
      kokoroLanguage: 'en' as const,
      telemetry: {},
    };

    const normalized = normalizeSessionForPersistence(session);
    expect(normalized.ttsLanguage).toBeNull();
    expect(normalized.kokoroLanguage).toBe('en');
  });

  it('switching from input3 to input2 does not keep kokoroLanguage in saved JSON', () => {
    const session = {
      inputMode: 'input2' as const,
      ttsLanguage: 'de' as const,
      // stale carry-over that should be cleared
      kokoroLanguage: 'en' as const,
      telemetry: {},
    };

    const normalized = normalizeSessionForPersistence(session);
    expect(normalized.kokoroLanguage).toBeNull();
  });

  it('timeAtRate converts correctly to sorted rateDistribution', () => {
    const legacy = { '0.97': 79, '0.96': 90 };
    expect(normalizeRateDistribution(legacy)).toEqual([
      { rate: 0.96, seconds: 90 },
      { rate: 0.97, seconds: 79 },
    ]);
  });

  it('cloneTelemetry supports legacy timeAtRate and returns rateDistribution only', () => {
    const telemetry = cloneTelemetry({
      startedAt: '2026-04-28T10:00:00.000Z',
      timeAtRate: { '0.97': 79, '0.96': 90 },
      lagSeries: [1],
      wpmSeries: [2],
      accuracySeries: [3],
      actions: [],
      ttsChunks: [],
      repeatCount: 0,
    });

    expect(telemetry.rateDistribution).toEqual([
      { rate: 0.96, seconds: 90 },
      { rate: 0.97, seconds: 79 },
    ]);
  });

  it('treats finishedAt as finalized attempt telemetry even when submit action is missing', () => {
    expect(
      hasFinalizedAttemptTelemetry({
        startedAt: '2026-05-18T10:00:00.000Z',
        finishedAt: '2026-05-18T10:05:00.000Z',
        actions: [],
      }),
    ).toBe(true);
  });

  it('does not treat unfinished TTS telemetry as finalized without submit or finishedAt', () => {
    expect(
      hasFinalizedAttemptTelemetry({
        startedAt: '2026-05-18T10:00:00.000Z',
        actions: [{ t: 1, action: 'play', rate: 1 }],
      }),
    ).toBe(false);
  });

  it('treats finished browser TTS sessions with source and attempt text as submitted when telemetry markers are missing', () => {
    expect(
      isSubmittedFinishedAttempt({
        inputMode: 'input2',
        status: 'finished',
        ttsText: 'Bonjour tout le monde',
        ttsPracticeText: 'Bonjour tout le monde',
        metrics: { wpm: 42, points: 0, score: 0 },
        telemetry: { actions: [] },
      }),
    ).toBe(true);
  });

  it('does not treat finished browser TTS sessions as submitted when attempt text is empty', () => {
    expect(
      isSubmittedFinishedAttempt({
        inputMode: 'input2',
        status: 'finished',
        ttsText: 'Bonjour tout le monde',
        ttsPracticeText: '   ',
        metrics: { wpm: 0, points: 0, score: 0 },
        telemetry: { actions: [] },
      }),
    ).toBe(false);
  });

  it('treats finished browser TTS sessions with real score signals as submitted even when practice text is missing', () => {
    expect(
      isSubmittedFinishedAttempt({
        inputMode: 'input2',
        status: 'finished',
        ttsText: 'Alltägliche Erlebnisse im Park',
        ttsPracticeText: '',
        metrics: { points: 78, score: 297, wpm: 31.2 },
        telemetry: { actions: [] },
      }),
    ).toBe(true);
  });
});
