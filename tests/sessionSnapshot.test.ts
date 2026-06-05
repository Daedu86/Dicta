import { describe, expect, it } from 'vitest';
import { normalizeSessionModeData } from '../src/core/sessionNormalization';
import { sessionSnapshotJson, type SessionSnapshot } from '../src/core/sessionSnapshot';

describe('Session modeData schema', () => {
  it('input2 creates only modeData.input2', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input2',
      ttsLanguage: 'es',
      kokoroLanguage: 'en',
      ttsText: 'abcd',
      kokoroText: 'stale',
    });

    expect(modeData).toEqual({
      input2: { type: 'builtInTts', language: 'es', textLength: 4 },
      input3: null,
    });
  });

  it('input2 French export preserves fr language in modeData', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input2',
      ttsLanguage: 'fr',
      ttsText: 'bonjour tout le monde',
    });

    expect(modeData).toEqual({
      input2: { type: 'builtInTts', language: 'fr', textLength: 21 },
      input3: null,
    });
  });

  it('input4 Portuguese export preserves pt language in modeData', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input4',
      ttsLanguage: 'pt',
      ttsText: 'ola mundo',
    });

    expect(modeData).toEqual({
      input2: { type: 'builtInTts', language: 'pt', textLength: 9 },
      input3: null,
    });
  });

  it('input3 creates only modeData.input3', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input3',
      ttsLanguage: 'es',
      kokoroLanguage: 'en',
      kokoroText: 'kokoro',
      ttsText: 'stale',
    });

    expect(modeData).toEqual({
      input2: null,
      input3: { type: 'kokoro', language: 'en', textLength: 6, nativeLanguage: true, processedLanguage: 'en' },
    });
  });

  it('old flat input2 session migrates correctly from textSummary', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input2',
      ttsLanguage: 'es',
      textSummary: {
        ttsTextLength: 1849,
        kokoroTextLength: 0,
      },
    });

    expect(modeData.input2).toEqual({ type: 'builtInTts', language: 'es', textLength: 1849 });
    expect(modeData.input3).toBeNull();
  });

  it('old flat input3 session migrates correctly from textSummary', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input3',
      kokoroLanguage: 'en',
      textSummary: {
        kokoroTextLength: 999,
        ttsTextLength: 0,
      },
    });

    expect(modeData.input3).toEqual({
      type: 'kokoro',
      language: 'en',
      textLength: 999,
      nativeLanguage: true,
      processedLanguage: 'en',
    });
    expect(modeData.input2).toBeNull();
  });

  it('input3 Spanish export marks nativeLanguage true and processedLanguage es', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input3',
      kokoroLanguage: 'es',
      kokoroText: 'hola mundo',
    });

    expect(modeData.input3).toEqual({
      type: 'kokoro',
      language: 'es',
      textLength: 10,
      nativeLanguage: true,
      processedLanguage: 'es',
    });
  });

  it('input3 German export marks nativeLanguage false', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input3',
      kokoroLanguage: 'de',
      kokoroText: 'guten tag',
    });

    expect(modeData.input3).toEqual({
      type: 'kokoro',
      language: 'de',
      textLength: 9,
      nativeLanguage: false,
      processedLanguage: null,
    });
  });

  it('input3 Portuguese export marks nativeLanguage false', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input3',
      kokoroLanguage: 'pt',
      kokoroText: 'ola mundo',
    });

    expect(modeData.input3).toEqual({
      type: 'kokoro',
      language: 'pt',
      textLength: 9,
      nativeLanguage: false,
      processedLanguage: null,
    });
  });

  it('switching input3 to input2 removes old Kokoro data', () => {
    const modeData = normalizeSessionModeData({
      inputMode: 'input2',
      ttsLanguage: 'de',
      kokoroLanguage: 'en', // stale carry-over
      kokoroText: 'stale',
      ttsText: 'active',
    });

    expect(modeData.input2).toEqual({ type: 'builtInTts', language: 'de', textLength: 6 });
    expect(modeData.input3).toBeNull();
  });

  it('saved JSON does not contain stale flat fields and preserves rateDistribution', () => {
    const json = sessionSnapshotJson({
      id: 'abc',
      name: 'Session 1',
      createdAt: '2026-04-28T10:00:00.000Z',
      updatedAt: '2026-04-28T10:10:00.000Z',
      inputMode: 'input2',
      difficulty: 'normal',
      status: 'finished',
      // legacy flat language fields that must not be emitted anymore
      ttsLanguage: 'es',
      kokoroLanguage: 'en',
      // active mode content
      ttsText: 'abcd',
      // telemetry
      telemetry: {
        startedAt: '2026-04-28T10:00:00.000Z',
        finishedAt: '2026-04-28T10:04:01.000Z',
        lagSeries: [0.1],
        wpmSeries: [55],
        accuracySeries: [92],
        actions: [],
        ttsChunks: [],
        repeatCount: 0,
        rateDistribution: [{ rate: 0.96, seconds: 90 }],
      },
    });

    const parsed = JSON.parse(json) as SessionSnapshot;
    expect(parsed).toHaveProperty('modeData');
    expect(parsed).not.toHaveProperty('ttsLanguage');
    expect(parsed).not.toHaveProperty('kokoroLanguage');
    expect(parsed).not.toHaveProperty('textSummary');

    expect(parsed.modeData).toEqual({
      input2: { type: 'builtInTts', language: 'es', textLength: 4 },
      input3: null,
    });

    expect(parsed.telemetrySummary.rateDistribution).toEqual([{ rate: 0.96, seconds: 90 }]);
  });

  it('saved JSON uses voice duration instead of attempt elapsed duration', () => {
    const json = sessionSnapshotJson({
      id: 'tts-duration',
      name: 'TTS duration',
      inputMode: 'input2',
      ttsLanguage: 'de',
      ttsText: 'eins zwei drei vier',
      metrics: { rate: 0.8 },
      telemetry: {
        startedAt: '2026-04-28T10:00:00.000Z',
        finishedAt: '2026-04-28T10:10:00.000Z',
        lagSeries: [],
        wpmSeries: [],
        accuracySeries: [],
        actions: [],
        ttsChunks: [],
        repeatCount: 0,
        rateDistribution: [],
      },
    });

    const parsed = JSON.parse(json) as SessionSnapshot;
    expect(parsed.telemetrySummary.durationSec).toBeCloseTo(4 / 2.6, 5);
  });

  it('saved JSON includes explicit Kokoro native-language metadata', () => {
    const json = sessionSnapshotJson({
      id: 'kokoro-es',
      name: 'Kokoro ES',
      inputMode: 'input3',
      kokoroLanguage: 'es',
      kokoroText: 'hola mundo',
      telemetry: {
        startedAt: '',
        lagSeries: [],
        wpmSeries: [],
        accuracySeries: [],
        actions: [],
        ttsChunks: [],
        repeatCount: 0,
        rateDistribution: [],
      },
    });

    const parsed = JSON.parse(json) as SessionSnapshot;
    expect(parsed.modeData.input3).toEqual({
      type: 'kokoro',
      language: 'es',
      textLength: 10,
      nativeLanguage: true,
      processedLanguage: 'es',
    });
  });

  it('saved JSON preserves generated session errors', () => {
    const json = sessionSnapshotJson({
      id: 'generated-error',
      name: 'Session 1 generation error',
      inputMode: 'input2',
      ttsLanguage: 'de',
      status: 'error',
      generationError: 'JSON must parse.',
      telemetry: {
        startedAt: '',
        lagSeries: [],
        wpmSeries: [],
        accuracySeries: [],
        actions: [],
        ttsChunks: [],
        repeatCount: 0,
        rateDistribution: [],
      },
    });

    const parsed = JSON.parse(json) as SessionSnapshot;
    expect(parsed.status).toBe('error');
    expect(parsed.generationError).toBe('JSON must parse.');
    expect(parsed.modeData.input2).toEqual({ type: 'builtInTts', language: 'de', textLength: 0 });
  });
});
