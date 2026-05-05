import { describe, expect, it } from 'vitest';
import {
  computeControlFidelityScore,
  computeSemanticFidelityScore,
  createEmptyInputLanguageBenchmark,
  deriveWeakAreas,
  pickBestRateRange,
  pruneTimelineToRollingWindow,
  updateInputLanguageBenchmark,
} from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type {
  AdaptiveTimelinePoint,
  InputLanguageBenchmarkMetrics,
  LiveTelemetryFrame,
  PacingDecision,
} from '../src/core/adaptive/types';

function live(overrides: Partial<LiveTelemetryFrame> = {}): LiveTelemetryFrame {
  return {
    inputMode: 'browser-tts',
    phraseId: 'p1',
    spokenProgressRatio: 0.4,
    typedProgressRatio: 0.3,
    lagSec: 1.2,
    lagWords: 2,
    lagChars: 10,
    accuracy: 0.9,
    errorRate: 0.1,
    wpm: 52,
    charsPerMinute: 240,
    pauseMs: 600,
    longestPauseMs: 900,
    backspaceRate: 0.04,
    correctionRate: 0.05,
    phraseDifficulty: 0.4,
    phraseLengthWords: 9,
    phraseLengthChars: 60,
    language: 'en',
    currentPlaybackRate: 1,
    currentPauseAfterPhraseMs: 700,
    trend: 'stable',
    canPauseAfter: true,
    canReplayIndependently: true,
    semanticCompleteness: 0.9,
    phraseBoundaryType: 'clause',
    ...overrides,
  };
}

function decision(overrides: Partial<PacingDecision> = {}): PacingDecision {
  return {
    mode: 'balanced',
    playbackRate: 1,
    pauseAfterPhraseMs: 700,
    shouldPauseNow: false,
    shouldReplayPhrase: false,
    boundaryStrictness: 'clause',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.95,
    nextPhraseSize: 'medium',
    reason: 'test',
    lagScore: 0.5,
    accuracyScore: 0.9,
    hesitationScore: 0.2,
    confidenceScore: 0.8,
    ...overrides,
  };
}

describe('AdaptiveInputLanguageBenchmarkService', () => {
  it('creates separate profiles for browser-tts/en and browser-tts/es', () => {
    const en = updateInputLanguageBenchmark({ live: live({ language: 'en' }), decision: decision(), sessionId: 's1' });
    const es = updateInputLanguageBenchmark({ live: live({ language: 'es' }), decision: decision(), sessionId: 's2' });
    expect(en.inputMode).toBe('browser-tts');
    expect(en.language).toBe('en');
    expect(es.language).toBe('es');
    expect(en.sampleCount).toBe(1);
    expect(es.sampleCount).toBe(1);
  });

  it('updating kokoro/en does not modify kokoro/de', () => {
    const de = createEmptyInputLanguageBenchmark('kokoro', 'de');
    const en = updateInputLanguageBenchmark({
      current: createEmptyInputLanguageBenchmark('kokoro', 'en'),
      live: live({ inputMode: 'kokoro', language: 'en' }),
      decision: decision(),
    });
    expect(de.sampleCount).toBe(0);
    expect(en.sampleCount).toBe(1);
    expect(en.language).toBe('en');
  });

  it('updating browser-tts/en does not modify kokoro/en', () => {
    const kokoro = createEmptyInputLanguageBenchmark('kokoro', 'en');
    const browser = updateInputLanguageBenchmark({ live: live({ inputMode: 'browser-tts', language: 'en' }), decision: decision() });
    expect(kokoro.inputMode).toBe('kokoro');
    expect(kokoro.sampleCount).toBe(0);
    expect(browser.inputMode).toBe('browser-tts');
  });

  it('maps missing language to unknown', () => {
    const profile = updateInputLanguageBenchmark({ live: live({ language: undefined }), decision: decision() });
    expect(profile.language).toBe('unknown');
  });

  it('clamps sweetSpotScore between 0 and 1', () => {
    const profile: InputLanguageBenchmarkMetrics = {
      ...createEmptyInputLanguageBenchmark('audio', 'en'),
      semanticFidelityScore: 10,
      controlFidelityScore: 10,
      learningEffectivenessScore: 10,
      flowStabilityScore: 10,
    };
    const updated = updateInputLanguageBenchmark({ current: profile, live: live({ inputMode: 'audio' }), decision: decision() });
    expect(updated.sweetSpotScore).toBeGreaterThanOrEqual(0);
    expect(updated.sweetSpotScore).toBeLessThanOrEqual(1);
  });

  it('semanticFidelityScore decreases with unsafePauseCount', () => {
    const clean = { ...createEmptyInputLanguageBenchmark('audio', 'en'), sampleCount: 10, unsafePauseCount: 0, averageSemanticCompleteness: 0.95 };
    const unsafe = { ...clean, unsafePauseCount: 6, semanticCutPenalty: 6 };
    expect(computeSemanticFidelityScore(unsafe)).toBeLessThan(computeSemanticFidelityScore(clean));
  });

  it('controlFidelityScore decreases when replay was requested but not executed', () => {
    const clean = { ...createEmptyInputLanguageBenchmark('audio', 'en'), sampleCount: 10, replayDeniedByBoundaryCount: 0 };
    const denied = { ...clean, replayDeniedByBoundaryCount: 6 };
    expect(computeControlFidelityScore(denied)).toBeLessThan(computeControlFidelityScore(clean));
  });

  it('best rate range chooses buckets with high accuracy and stable lag', () => {
    const range = pickBestRateRange([
      { rate: 1.1, seconds: 8, averageAccuracy: 0.72, averageLagSec: 3.5, averageWpm: 60, sampleCount: 8 },
      { rate: 0.95, seconds: 8, averageAccuracy: 0.93, averageLagSec: 0.4, averageWpm: 55, sampleCount: 8 },
      { rate: 0.98, seconds: 6, averageAccuracy: 0.91, averageLagSec: 0.6, averageWpm: 56, sampleCount: 6 },
    ]);
    expect(range[0]).toBeGreaterThanOrEqual(0.95);
    expect(range[1]).toBeLessThanOrEqual(0.98);
  });

  it('weakAreas includes unsafe_boundaries and high_rate when thresholds are exceeded', () => {
    const profile: InputLanguageBenchmarkMetrics = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      sampleCount: 20,
      unsafePauseCount: 5,
      rateAccuracyBuckets: [
        { rate: 1.08, seconds: 5, averageAccuracy: 0.7, averageLagSec: 2, averageWpm: 55, sampleCount: 5 },
      ],
    };
    expect(deriveWeakAreas(profile)).toContain('unsafe_boundaries');
    expect(deriveWeakAreas(profile)).toContain('high_rate');
  });

  it('timeline is capped and pruned', () => {
    const now = Date.now();
    const points: AdaptiveTimelinePoint[] = Array.from({ length: 520 }, (_, index) => ({
      timestampMs: now - index * 1000,
      inputMode: 'audio',
      language: 'en',
      mode: 'balanced',
      playbackRate: 1,
      accuracy: 0.9,
      lagSec: 0,
      wpm: 50,
      pauseMs: 700,
    }));
    const pruned = pruneTimelineToRollingWindow(points, 30);
    expect(pruned.length).toBeLessThanOrEqual(450);
  });

  it('tracks robust lag stats and resists raw outlier distortion', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'es');
    const base = Date.now();
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ lagSec: 0.3, rawLagSec: 0.3, stableLagSec: 0.3 }),
      decision: decision(),
      timestampMs: base + 1000,
      sessionId: 's1',
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ lagSec: -5, rawLagSec: -91.6, stableLagSec: -5 }),
      decision: decision(),
      timestampMs: base + 2000,
      sessionId: 's1',
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ lagSec: 0.4, rawLagSec: 0.4, stableLagSec: 0.4 }),
      decision: decision(),
      timestampMs: base + 3000,
      sessionId: 's1',
    });

    expect(profile.rawAverageLagSec).toBeLessThan(-25);
    expect(profile.stableAverageLagSec).toBeGreaterThan(-2);
    expect(profile.averageLagSec).toBe(profile.stableAverageLagSec);
    expect(profile.lagOutlierCount).toBe(1);
    expect(profile.p90AbsLagSec).toBeLessThanOrEqual(5);
  });
});
