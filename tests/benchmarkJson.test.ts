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
    expect(payload.acceptedTelemetrySamples).toBe(3);
    expect(payload.benchmarkSessionCount).toBe(payload.sessionCount);
    expect(payload.countSemantics).toContain('not all saved sessions');
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

  it('normalizes stale browser-tts DE pressure recommendations before export', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.sampleCount = 2;
    profile.sweetSpotScore = 0.9709;
    profile.flowStabilityScore = 1;
    profile.weakAreas = [];
    profile.recommendation = {
      ...profile.recommendation,
      targetRateRange: [1.05, 1.05],
      targetPhraseSize: 'short',
      targetPauseMs: 750,
      nextTrainingFocus: ['Maintain stable pace and medium-length semantic phrases'],
      confidence: 0.0485,
      summary: 'Maintain stable pace and medium-length semantic phrases.',
    };
    profile.timeline = Array.from({ length: 12 }, (_, index) => ({
      timestampMs: Date.now() + index,
      inputMode: 'browser-tts' as const,
      language: 'de',
      mode: 'support' as const,
      playbackRate: 1.05,
      accuracy: 0.7,
      lagSec: index % 4 === 0 ? 3.4 : 1.4,
      rawLagSec: index === 2 ? -46 : 1.4,
      stableLagSec: index === 2 ? -5 : 1.4,
      wpm: 48,
      pauseMs: 1200,
      phraseBoundaryType: index % 3 === 0 ? ('unsafe' as const) : ('clause' as const),
      semanticCompleteness: index % 3 === 0 ? 0.6 : 0.82,
      decisionReason: 'support-needed, replay-blocked-boundary',
      event: 'phrase_advance' as const,
    }));

    const payload = buildSelectedBenchmarkExportPayload(profile);

    expect(payload.recommendation.targetRateRange).toEqual([0.95, 1]);
    expect(payload.recommendation.targetPauseMs).toBe(1200);
    expect(payload.weakAreas).toEqual(
      expect.arrayContaining(['support_dependency', 'unsafe_boundary_pressure', 'lag_instability', 'accuracy_instability']),
    );
    expect(payload.flowStabilityScore).toBeLessThan(1);
    expect(payload.recommendation.summary).not.toContain('medium-length semantic phrases');
  });

  it('builds benchmark filename with input, language, and timestamp', () => {
    const now = new Date('2026-04-30T09:25:30');
    const filename = buildBenchmarkFilename('kokoro', 'en', now);
    expect(filename).toBe('adaptive-benchmark-kokoro-en-2026-04-30-092530.json');
  });
});
