import { describe, expect, it } from 'vitest';
import { buildBenchmarkFilename, buildSelectedBenchmarkExportPayload } from '../src/core/adaptive/benchmarkJson';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';

describe('benchmarkJson', () => {
  it('builds payload with required benchmark fields', () => {
    const profile = createEmptyInputLanguageBenchmark('kokoro', 'en');
    profile.sampleCount = 3;
    profile.timeline = [
      {
        timestampMs: Date.now(),
        inputMode: 'kokoro',
        language: 'en',
        mode: 'balanced',
        playbackRate: 0.95,
        accuracy: 0.88,
        lagSec: 0.9,
        wpm: 54,
        pauseMs: 700,
        phraseIndex: 2,
        totalSemanticPhrases: 10,
        phraseId: 'p-2',
        decisionReason: 'test reason',
        executionHint: 'wait boundary',
        event: 'phrase_advance',
      },
    ];
    const payload = buildSelectedBenchmarkExportPayload(profile);
    expect(payload.inputMode).toBe('kokoro');
    expect(payload.language).toBe('en');
    expect(payload.sampleCount).toBe(3);
    expect(payload.recommendation).toBeDefined();
    expect(payload.rateAccuracyBuckets).toBeDefined();
    expect(payload.recentTimelinePoints.length).toBe(1);
    expect(payload.debug.currentPhraseIndex).toBe(2);
    expect(payload.debug.lastDecisionReason).toBe('test reason');
  });

  it('caps recent timeline points to 60', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'es');
    profile.timeline = Array.from({ length: 120 }, (_, index) => ({
      timestampMs: Date.now() + index,
      inputMode: 'browser-tts' as const,
      language: 'es',
      mode: 'balanced' as const,
      playbackRate: 1,
      accuracy: 0.9,
      lagSec: 0.5,
      wpm: 50,
      pauseMs: 700,
    }));
    const payload = buildSelectedBenchmarkExportPayload(profile);
    expect(payload.recentTimelinePoints.length).toBe(60);
  });

  it('builds benchmark filename with input, language, and timestamp', () => {
    const now = new Date('2026-04-30T09:25:30');
    const filename = buildBenchmarkFilename('kokoro', 'en', now);
    expect(filename).toBe('adaptive-benchmark-kokoro-en-2026-04-30-092530.json');
  });
});
