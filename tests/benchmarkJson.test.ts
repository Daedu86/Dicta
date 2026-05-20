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

    expect(payload.recommendation.targetRateRange).toEqual([0.8, 0.85]);
    expect(payload.recommendation.targetPauseMs).toBe(1200);
    expect(payload.weakAreas).toEqual(
      expect.arrayContaining(['support_dependency', 'unsafe_boundary_pressure', 'accuracy_instability']),
    );
    expect(payload.weakAreas).not.toContain('lag_instability');
    expect(payload.flowStabilityScore).toBeLessThan(1);
    expect(payload.recommendation.summary).not.toContain('medium-length semantic phrases');
  });

  it('includes browser-tts DE diagnostics for runtime recovery pauses in export', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.recommendation = {
      ...profile.recommendation,
      targetPauseMs: 1200,
    };
    profile.timeline = [
      {
        timestampMs: Date.now(),
        inputMode: 'browser-tts',
        language: 'de',
        mode: 'support',
        playbackRate: 0.8,
        accuracy: 0.72,
        lagSec: 3.4,
        rawLagSec: 3.4,
        stableLagSec: 3.4,
        wpm: 42,
        pauseMs: 2600,
        phraseBoundaryType: 'clause',
        semanticCompleteness: 0.82,
        decisionReason: 'mode=support, android-speech-rate-fallback, browser-tts-de-recovery-severe',
        event: 'phrase_completed',
      },
    ];

    const payload = buildSelectedBenchmarkExportPayload(profile);

    expect(payload.browserTtsDeDiagnostics?.targetPauseMs).toBe(1200);
    expect(payload.browserTtsDeDiagnostics?.runtimeRecoveryPauseMs).toBe(2600);
    expect(payload.browserTtsDeDiagnostics?.pauseGapMs).toBe(1400);
    expect(payload.browserTtsDeDiagnostics?.note).toContain('executable Android/DE safety pause');
  });

  it('omits browser-tts DE diagnostics from neighboring export profiles', () => {
    const profiles = [
      createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      createEmptyInputLanguageBenchmark('browser-tts', 'es'),
      createEmptyInputLanguageBenchmark('audio', 'de'),
      createEmptyInputLanguageBenchmark('kokoro', 'de'),
      createEmptyInputLanguageBenchmark('qwen-cloud', 'de'),
    ];

    for (const profile of profiles) {
      const payload = buildSelectedBenchmarkExportPayload(profile);
      expect(payload.browserTtsDeDiagnostics).toBeUndefined();
    }
  });

  it('builds benchmark filename with input, language, and timestamp', () => {
    const now = new Date('2026-04-30T09:25:30');
    const filename = buildBenchmarkFilename('kokoro', 'en', now);
    expect(filename).toBe('adaptive-benchmark-kokoro-en-2026-04-30-092530.json');
  });
});
