import { describe, expect, it } from 'vitest';
import { cloneTelemetry, normalizeRateDistribution, normalizeSessionForPersistence } from '../src/core/sessionNormalization';

describe('sessionNormalization', () => {
  it('input1 only keeps transcriptionLanguage', () => {
    const session = {
      inputMode: 'input1' as const,
      transcriptionLanguage: 'de' as const,
      ttsLanguage: 'es' as const,
      kokoroLanguage: 'en' as const,
      telemetry: {},
    };

    const normalized = normalizeSessionForPersistence(session);
    expect(normalized.transcriptionLanguage).toBe('de');
    expect(normalized.ttsLanguage).toBeNull();
    expect(normalized.kokoroLanguage).toBeNull();
  });

  it('input2 only keeps ttsLanguage', () => {
    const session = {
      inputMode: 'input2' as const,
      transcriptionLanguage: 'de' as const,
      ttsLanguage: 'es' as const,
      kokoroLanguage: 'en' as const,
      telemetry: {},
    };

    const normalized = normalizeSessionForPersistence(session);
    expect(normalized.transcriptionLanguage).toBeNull();
    expect(normalized.ttsLanguage).toBe('es');
    expect(normalized.kokoroLanguage).toBeNull();
  });

  it('input3 only keeps kokoroLanguage', () => {
    const session = {
      inputMode: 'input3' as const,
      transcriptionLanguage: 'de' as const,
      ttsLanguage: 'es' as const,
      kokoroLanguage: 'en' as const,
      telemetry: {},
    };

    const normalized = normalizeSessionForPersistence(session);
    expect(normalized.transcriptionLanguage).toBeNull();
    expect(normalized.ttsLanguage).toBeNull();
    expect(normalized.kokoroLanguage).toBe('en');
  });

  it('switching from input3 to input2 does not keep kokoroLanguage in saved JSON', () => {
    const session = {
      inputMode: 'input2' as const,
      transcriptionLanguage: null,
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
});

