import { describe, expect, it } from 'vitest';
import {
  clampBrowserTtsDeDecisionToRecommendation,
  computeBenchmarkRecommendation,
  computeControlFidelityScore,
  computeSemanticFidelityScore,
  createEmptyInputLanguageBenchmark,
  deriveWeakAreas,
  normalizeInputLanguageBenchmarkForRecommendation,
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

function buildBrowserTtsDePressureProfile(): InputLanguageBenchmarkMetrics {
  let profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
  const base = Date.now();
  for (let index = 0; index < 20; index += 1) {
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({
        language: 'de',
        accuracy: index % 3 === 0 ? 0.64 : 0.76,
        lagSec: index % 5 === 0 ? 3.2 : 1.4,
        rawLagSec: index === 2 ? -112 : index % 5 === 0 ? 3.2 : 1.4,
        stableLagSec: index === 2 ? -5 : index % 5 === 0 ? 3.2 : 1.4,
        phraseBoundaryType: index % 4 === 0 ? 'unsafe' : 'clause',
        semanticCompleteness: index % 4 === 0 ? 0.62 : 0.86,
      }),
      decision: decision({
        mode: 'support',
        playbackRate: 1.05,
        replayRate: 1,
        pauseAfterPhraseMs: 1200,
        nextPhraseSize: 'short',
        reason: 'support-needed, phrase-overload, long-phrase-sensitive, replay-blocked-boundary',
      }),
      event: 'phrase_advance',
      timestampMs: base + index * 1000,
      sessionId: 'stable-playback-high-pressure',
      phraseIndex: index,
      totalSemanticPhrases: 20,
    });
  }
  return profile;
}

function buildPressureProfile(inputMode: LiveTelemetryFrame['inputMode'], language: string): InputLanguageBenchmarkMetrics {
  let profile = createEmptyInputLanguageBenchmark(inputMode, language);
  const base = Date.now();
  for (let index = 0; index < 20; index += 1) {
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({
        inputMode,
        language,
        accuracy: 0.64,
        lagSec: 3.1,
        rawLagSec: index === 2 ? -112 : 3.1,
        stableLagSec: index === 2 ? -5 : 3.1,
        phraseBoundaryType: index % 3 === 0 ? 'unsafe' : 'clause',
        semanticCompleteness: index % 3 === 0 ? 0.62 : 0.86,
      }),
      decision: decision({
        mode: 'support',
        playbackRate: 1.05,
        replayRate: 1,
        pauseAfterPhraseMs: 1200,
        nextPhraseSize: 'short',
        reason: 'support-needed, replay-blocked-boundary',
      }),
      event: 'phrase_advance',
      timestampMs: base + index * 1000,
      sessionId: `${inputMode}-${language}`,
    });
  }
  return profile;
}

function buildStaleBrowserTtsDePressureProfile(): InputLanguageBenchmarkMetrics {
  const base = Date.now();
  return {
    ...createEmptyInputLanguageBenchmark('browser-tts', 'de'),
    sessionCount: 1,
    sampleCount: 2,
    sweetSpotScore: 0.9709,
    flowStabilityScore: 1,
    weakAreas: [],
    recommendation: {
      targetRateRange: [1.05, 1.05],
      targetPhraseSize: 'short',
      targetPauseMs: 750,
      nextTrainingFocus: ['Maintain stable pace and medium-length semantic phrases'],
      confidence: 0.0485,
      summary: 'Maintain stable pace and medium-length semantic phrases.',
    },
    timeline: Array.from({ length: 12 }, (_, index) => ({
      timestampMs: base + index * 1000,
      inputMode: 'browser-tts' as const,
      language: 'de',
      mode: 'support' as const,
      playbackRate: 1.05,
      accuracy: index % 3 === 0 ? 0.69 : 0.73,
      lagSec: index % 4 === 0 ? 3.6 : 1.4,
      rawLagSec: index === 2 ? -46 : index === 7 ? -21 : index % 4 === 0 ? 3.6 : 1.4,
      stableLagSec: index === 2 || index === 7 ? -5 : index % 4 === 0 ? 3.6 : 1.4,
      wpm: 48,
      pauseMs: 1200,
      phraseBoundaryType: index % 3 === 0 ? 'unsafe' as const : 'clause' as const,
      semanticCompleteness: index % 3 === 0 ? 0.6 : 0.82,
      decisionReason: 'support-needed, phrase-overload, long-phrase-sensitive, replay-blocked-boundary',
      event: 'phrase_advance' as const,
      sessionId: 'stale-pressure',
      phraseIndex: index,
    })),
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

  it('calibrates browser-tts ES recommendation floor to 0.86 in high-accuracy near-zero-lag conditions', () => {
    const profile: InputLanguageBenchmarkMetrics = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'es'),
      sampleCount: 20,
      averageAccuracy: 0.95,
      averageWpm: 68,
      averageLagSec: 0.1,
      stableAverageLagSec: 0.1,
      p90AbsLagSec: 0.8,
      rateAccuracyBuckets: [
        { rate: 0.81, seconds: 6, averageAccuracy: 0.98, averageLagSec: 0.05, averageWpm: 66, sampleCount: 6 },
        { rate: 0.83, seconds: 6, averageAccuracy: 0.97, averageLagSec: 0.06, averageWpm: 67, sampleCount: 6 },
      ],
    };
    const recommendation = computeBenchmarkRecommendation(profile);
    expect(recommendation.targetRateRange[0]).toBeGreaterThanOrEqual(0.86);
    expect(recommendation.targetRateRange[1]).toBeGreaterThanOrEqual(recommendation.targetRateRange[0] + 0.04);
  });

  it('does not calibrate recommendation floor for non-browser-tts-es profiles', () => {
    const profile: InputLanguageBenchmarkMetrics = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      sampleCount: 20,
      averageAccuracy: 0.95,
      stableAverageLagSec: 0.1,
      p90AbsLagSec: 0.8,
      rateAccuracyBuckets: [
        { rate: 0.82, seconds: 8, averageAccuracy: 0.97, averageLagSec: 0.05, averageWpm: 66, sampleCount: 8 },
      ],
    };
    const recommendation = computeBenchmarkRecommendation(profile);
    expect(recommendation.targetRateRange[0]).toBeLessThan(0.86);
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

  it('excludes invalid browser-tts DE lag and unsafe-boundary samples from benchmark scoring', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const base = Date.now();
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', lagSec: 0.3, rawLagSec: 0.3, stableLagSec: 0.3 }),
      decision: decision({ playbackRate: 0.82, replayRate: 0.8 }),
      event: 'phrase_advance',
      timestampMs: base + 1000,
      sessionId: 's1',
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', lagSec: -5, rawLagSec: -91.6, stableLagSec: -5 }),
      decision: decision({ playbackRate: 0.9, replayRate: 0.86 }),
      event: 'phrase_advance',
      timestampMs: base + 2000,
      sessionId: 's1',
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({
        language: 'de',
        lagSec: 0.2,
        rawLagSec: 0.2,
        stableLagSec: 0.2,
        phraseBoundaryType: 'unsafe',
        semanticCompleteness: 0.35,
      }),
      decision: decision({ playbackRate: 0.93, replayRate: 0.9 }),
      event: 'phrase_advance',
      timestampMs: base + 3000,
      sessionId: 's1',
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', lagSec: 0.4, rawLagSec: 0.4, stableLagSec: 0.4 }),
      decision: decision({ playbackRate: 0.84, replayRate: 0.8 }),
      event: 'phrase_advance',
      timestampMs: base + 4000,
      sessionId: 's1',
    });

    expect(profile.timeline).toHaveLength(4);
    expect(profile.sampleCount).toBe(2);
    expect(profile.rawAverageLagSec).toBeCloseTo(0.35);
    expect(profile.stableAverageLagSec).toBeCloseTo(0.35);
    expect(profile.averageLagSec).toBeCloseTo(0.35);
    expect(profile.lagOutlierCount).toBe(0);
    expect(profile.rateAccuracyBuckets.map((bucket) => bucket.rate)).toEqual([0.82, 0.84]);
    expect(profile.weakAreas).not.toContain('lag');
  });

  it('keeps zero-valid browser-tts DE samples out of weak areas and scoring', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const base = Date.now();
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', lagSec: -5, rawLagSec: -91.6, stableLagSec: -5, accuracy: 0 }),
      decision: decision({ playbackRate: 0.93, replayRate: 0.9 }),
      event: 'phrase_advance',
      timestampMs: base + 1000,
      sessionId: 's-invalid',
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({
        language: 'de',
        lagSec: 0.2,
        rawLagSec: 0.2,
        stableLagSec: 0.2,
        phraseBoundaryType: 'unsafe',
        semanticCompleteness: 0.35,
        accuracy: 0,
      }),
      decision: decision({ playbackRate: 0.9, replayRate: 0.86 }),
      event: 'phrase_advance',
      timestampMs: base + 2000,
      sessionId: 's-invalid',
    });

    expect(profile.timeline).toHaveLength(2);
    expect(profile.sampleCount).toBe(0);
    expect(profile.averageAccuracy).toBe(0);
    expect(profile.averageLagSec).toBe(0);
    expect(profile.learningEffectivenessScore).toBe(0);
    expect(profile.flowStabilityScore).toBeLessThan(1);
    expect(profile.sweetSpotScore).toBe(0);
    expect(profile.weakAreas).toEqual(expect.arrayContaining(['lag_instability', 'unsafe_boundary_pressure']));
    expect(profile.weakAreas).not.toContain('low_accuracy');
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.2);
    expect(profile.recommendation.targetRateRange).toEqual([0.8, 0.85]);
  });

  it('rejects missing rawLagSec and clipped browser-tts DE lag values', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const base = Date.now();
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', lagSec: -5, rawLagSec: undefined, stableLagSec: -5 }),
      decision: decision({ playbackRate: 0.9 }),
      event: 'phrase_advance',
      timestampMs: base + 1000,
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', lagSec: -5, rawLagSec: 0.2, stableLagSec: 0.2 }),
      decision: decision({ playbackRate: 0.91 }),
      event: 'phrase_advance',
      timestampMs: base + 2000,
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', lagSec: 0.2, rawLagSec: 0.2, stableLagSec: -5 }),
      decision: decision({ playbackRate: 0.92 }),
      event: 'phrase_advance',
      timestampMs: base + 3000,
    });

    expect(profile.timeline).toHaveLength(3);
    expect(profile.sampleCount).toBe(0);
    expect(profile.rateAccuracyBuckets).toEqual([]);
    expect(profile.weakAreas).toEqual([]);
  });

  it('excludes browser-tts DE defer_pause from scoring', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', lagSec: 0.25, rawLagSec: 0.25, stableLagSec: 0.25, accuracy: 0.1 }),
      decision: decision({ playbackRate: 0.9, deferPauseUntilSafeBoundary: true }),
      event: 'defer_pause',
      timestampMs: Date.now(),
    });

    expect(profile.timeline).toHaveLength(1);
    expect(profile.sampleCount).toBe(0);
    expect(profile.averageAccuracy).toBe(0);
    expect(profile.averageLagSec).toBe(0);
    expect(profile.weakAreas).toEqual([]);
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.2);
    expect(profile.recommendation.targetRateRange).toEqual([0.95, 1]);
  });

  it('scores stable browser-tts DE phrase_completed samples while keeping pause and defer_pause diagnostic-only', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const base = Date.now();
    const before = profile;

    for (let index = 0; index < 20; index += 1) {
      profile = updateInputLanguageBenchmark({
        current: profile,
        live: live({
          language: 'de',
          phraseId: `p${index}`,
          lagSec: index % 6 === 0 ? -84 : 1.2,
          rawLagSec: index % 6 === 0 ? -84 : 1.2,
          stableLagSec: index % 6 === 0 ? -5 : 1.2,
          accuracy: 0.78 + (index % 3) * 0.03,
          wpm: 42 + index,
          phraseBoundaryType: index % 7 === 0 ? 'unsafe' : 'clause',
          semanticCompleteness: index % 7 === 0 ? 0.35 : 0.86,
        }),
        decision: decision({ playbackRate: 0.95, pauseAfterPhraseMs: 1200, mode: 'support' }),
        event: index % 7 === 0 ? 'defer_pause' : 'pause',
        timestampMs: base + index * 2000,
        sessionId: 's22-stable',
        phraseIndex: index,
        totalSemanticPhrases: 20,
      });

      profile = updateInputLanguageBenchmark({
        current: profile,
        live: live({
          language: 'de',
          phraseId: `p${index}`,
          lagSec: index % 6 === 0 ? -84 : 0.4 + (index % 3) * 0.1,
          rawLagSec: index % 6 === 0 ? -84 : 0.4 + (index % 3) * 0.1,
          stableLagSec: index % 6 === 0 ? -5 : 0.4 + (index % 3) * 0.1,
          accuracy: 0.8 + (index % 4) * 0.025,
          wpm: 38 + index,
          phraseBoundaryType: index % 7 === 0 ? 'unsafe' : 'sentence',
          semanticCompleteness: index % 7 === 0 ? 0.35 : 1,
        }),
        decision: decision({ playbackRate: 0.95, pauseAfterPhraseMs: 1200, mode: 'balanced' }),
        event: 'phrase_completed',
        timestampMs: base + index * 2000 + 1000,
        sessionId: 's22-stable',
        phraseIndex: index,
        totalSemanticPhrases: 20,
      });
    }

    const scoringEvents = profile.timeline.filter((point) => point.event === 'phrase_completed');
    const diagnosticEvents = profile.timeline.filter((point) => point.event === 'pause' || point.event === 'defer_pause');

    expect(scoringEvents.length).toBe(20);
    expect(diagnosticEvents.length).toBe(20);
    expect(profile.sampleCount).toBeGreaterThan(1);
    expect(profile.sampleCount).toBe(14);
    expect(profile.averageWpm).toBeGreaterThan(40);
    expect(profile.averageAccuracy).toBeGreaterThan(0.8);
    expect(profile.averageAccuracy).not.toBe(before.averageAccuracy);
    expect(profile.averageWpm).not.toBe(before.averageWpm);
  });

  it('rejects browser-tts DE phrase_completed placeholder and invalid lag samples', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const base = Date.now();
    const invalidSamples: Array<Partial<LiveTelemetryFrame>> = [
      { lagSec: 0, rawLagSec: 0, stableLagSec: 0, accuracy: 1, wpm: 0 },
      { lagSec: -5, rawLagSec: -33, stableLagSec: -5, accuracy: 0.7, wpm: 44 },
      { lagSec: -5, rawLagSec: -55, stableLagSec: -5, accuracy: 0.7, wpm: 44 },
      { lagSec: -5, rawLagSec: -84, stableLagSec: -5, accuracy: 0.7, wpm: 44 },
      { lagSec: -5, rawLagSec: -95, stableLagSec: -5, accuracy: 0.7, wpm: 44 },
      { lagSec: -5, rawLagSec: -45, stableLagSec: -5, accuracy: 0.7, wpm: 44 },
      { lagSec: 0.4, rawLagSec: 0.4, stableLagSec: -5, accuracy: 0.8, wpm: 44 },
      { lagSec: 0.4, rawLagSec: 0.4, stableLagSec: 0.4, accuracy: 0.8, wpm: 44, phraseBoundaryType: 'unsafe', semanticCompleteness: 0.35 },
    ];

    invalidSamples.forEach((sample, index) => {
      profile = updateInputLanguageBenchmark({
        current: profile,
        live: live({ language: 'de', phraseId: `invalid-${index}`, ...sample }),
        decision: decision(),
        event: 'phrase_completed',
        timestampMs: base + index * 1000,
        sessionId: 's22-invalid',
        phraseIndex: index,
      });
    });

    expect(profile.timeline).toHaveLength(invalidSamples.length);
    expect(profile.sampleCount).toBe(0);
    expect(profile.averageAccuracy).toBe(0);
    expect(profile.averageWpm).toBe(0);
    expect(profile.averageLagSec).toBe(0);
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.3);
    expect(profile.rateAccuracyBuckets).toEqual([]);
    expect(profile.timeline.some((point) => point.rawLagSec === -33)).toBe(true);
    expect(profile.timeline.some((point) => point.rawLagSec === -55)).toBe(true);
    expect(profile.timeline.every((point) => point.decisionReason?.includes('rejected-benchmark-sample'))).toBe(true);
    expect(profile.timeline.filter((point) => point.rawLagSec === -33 || point.rawLagSec === -55).every((point) => point.decisionReason?.includes('invalid-lag-alignment'))).toBe(true);
  });

  it('dedupes browser-tts DE phrase_advance and phrase_completed scoring for the same phrase', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const base = Date.now();
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', phraseId: 'semantic-0', lagSec: 1.4, rawLagSec: 1.4, stableLagSec: 1.4, accuracy: 0.78 }),
      decision: decision({ playbackRate: 0.82 }),
      event: 'phrase_advance',
      timestampMs: base,
      sessionId: 'dedupe-session',
      phraseIndex: 0,
      totalSemanticPhrases: 1,
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'de', phraseId: 'semantic-0', lagSec: 0.4, rawLagSec: 0.4, stableLagSec: 0.4, accuracy: 0.92 }),
      decision: decision({ playbackRate: 0.84 }),
      event: 'phrase_completed',
      timestampMs: base + 1000,
      sessionId: 'dedupe-session',
      phraseIndex: 0,
      totalSemanticPhrases: 1,
    });

    expect(profile.timeline).toHaveLength(2);
    expect(profile.sampleCount).toBe(1);
    expect(profile.averageLagSec).toBeCloseTo(0.4);
    expect(profile.averageAccuracy).toBeCloseTo(0.92);
    expect(profile.rateAccuracyBuckets).toHaveLength(1);
    expect(profile.rateAccuracyBuckets[0].rate).toBe(0.84);
  });

  it('keeps browser-tts DE recommendation conservative when playback is clean but timeline pressure is high', () => {
    const profile = buildBrowserTtsDePressureProfile();

    expect(profile.sampleCount).toBeLessThan(30);
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.2);
    expect(profile.recommendation.targetRateRange).toEqual([0.8, 0.85]);
    expect(profile.recommendation.targetPauseMs).toBe(1200);
    expect(profile.recommendation.targetPhraseSize).toBe('short');
    expect(profile.recommendation.nextTrainingFocus).toEqual(
      expect.arrayContaining(['accuracy stability', 'lag control', 'safe semantic boundaries', 'reduce support dependency']),
    );
    expect(profile.recommendation.summary).toContain('Browser TTS DE');
  });

  it('derives browser-tts DE pressure weak areas from support, unsafe boundaries, lag, and low accuracy', () => {
    const profile = buildBrowserTtsDePressureProfile();

    expect(profile.weakAreas).toEqual(
      expect.arrayContaining(['support_dependency', 'unsafe_boundary_pressure', 'lag_instability', 'accuracy_instability']),
    );
  });

  it('does not allow severe browser-tts DE raw lag outliers to produce perfect flow readiness', () => {
    const profile = buildBrowserTtsDePressureProfile();

    expect(profile.timeline.some((point) => typeof point.rawLagSec === 'number' && point.rawLagSec < -10)).toBe(true);
    expect(profile.recommendation.targetRateRange).not.toEqual([1.05, 1.05]);
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.2);
    expect(profile.weakAreas).toContain('lag_instability');
    expect(profile.flowStabilityScore).toBeLessThan(1);
  });

  it('does not recommend fast rates during browser-tts DE recovery-severe pressure', () => {
    const base = Date.now();
    const profile: InputLanguageBenchmarkMetrics = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      sessionCount: 1,
      sampleCount: 12,
      sweetSpotScore: 0.8,
      recommendation: {
        targetRateRange: [0.95, 1],
        targetPhraseSize: 'medium',
        targetPauseMs: 750,
        nextTrainingFocus: ['Maintain stable pace'],
        confidence: 0.6,
        summary: 'Fast recommendation before pressure normalization.',
      },
      timeline: Array.from({ length: 8 }, (_, index) => ({
        timestampMs: base + index * 1000,
        inputMode: 'browser-tts' as const,
        language: 'de',
        mode: 'support' as const,
        playbackRate: 0.8,
        accuracy: 0.74,
        lagSec: 3.2,
        rawLagSec: 3.2,
        stableLagSec: 3.2,
        wpm: 42,
        pauseMs: 2600,
        phraseBoundaryType: 'clause' as const,
        semanticCompleteness: 0.86,
        decisionReason: 'mode=support, support-needed, browser-tts-de-recovery-severe',
        event: 'phrase_completed' as const,
        sessionId: 'recovery-severe',
        phraseIndex: index,
        totalSemanticPhrases: 8,
      })),
    };

    const normalized = normalizeInputLanguageBenchmarkForRecommendation(profile);

    expect(normalized.recommendation.targetRateRange).toEqual([0.8, 0.85]);
    expect(normalized.recommendation.targetRateRange).not.toEqual([0.95, 1]);
    expect(normalized.recommendation.confidence).toBeLessThanOrEqual(0.2);
    expect(normalized.recommendation.summary).toContain('severe recovery pressure');
  });

  it('normalizes stale browser-tts DE low-confidence pressure profiles before recommendation output', () => {
    const staleProfile = buildStaleBrowserTtsDePressureProfile();
    const normalized = normalizeInputLanguageBenchmarkForRecommendation(staleProfile);

    expect(normalized.recommendation.targetRateRange).not.toEqual([1.05, 1.05]);
    expect(normalized.recommendation.targetRateRange).toEqual([0.8, 0.85]);
    expect(normalized.recommendation.targetPauseMs).toBe(1200);
    expect(normalized.recommendation.confidence).toBeLessThanOrEqual(0.2);
    expect(normalized.flowStabilityScore).toBeLessThan(1);
    expect(normalized.sweetSpotScore).toBeLessThan(staleProfile.sweetSpotScore);
    expect(normalized.weakAreas).toEqual(
      expect.arrayContaining([
        'support_dependency',
        'unsafe_boundary_pressure',
        'lag_instability',
        'accuracy_instability',
      ]),
    );
    expect(normalized.recommendation.nextTrainingFocus).toEqual(
      expect.arrayContaining(['accuracy stability', 'lag control', 'safe semantic boundaries', 'reduce support dependency']),
    );
    expect(normalized.recommendation.summary).toContain('Browser TTS DE');
    expect(normalized.recommendation.summary).not.toContain('medium-length semantic phrases');
  });

  it('keeps browser-tts DE target phrase size and summary consistent', () => {
    const profile = buildBrowserTtsDePressureProfile();

    expect(profile.recommendation.targetPhraseSize).toBe('short');
    expect(profile.recommendation.summary).toContain('short semantic phrases');
    expect(profile.recommendation.summary).not.toContain('medium-length semantic phrases');
  });

  it('caps browser-tts DE low-sample confidence even without playback failures', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const base = Date.now();
    for (let index = 0; index < 10; index += 1) {
      profile = updateInputLanguageBenchmark({
        current: profile,
        live: live({ language: 'de', lagSec: 0.2, rawLagSec: 0.2, stableLagSec: 0.2, accuracy: 0.95 }),
        decision: decision({ playbackRate: 1.05, replayRate: 1, pauseAfterPhraseMs: 750 }),
        event: 'phrase_advance',
        timestampMs: base + index * 1000,
        sessionId: 'low-sample',
      });
    }

    expect(profile.sampleCount).toBe(10);
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.3);
    expect(profile.recommendation.targetRateRange).toEqual([0.95, 1]);
  });

  it('applies the conservative pressure fallback only to browser-tts DE', () => {
    const de = buildPressureProfile('browser-tts', 'de');
    const en = buildPressureProfile('browser-tts', 'en');
    const es = buildPressureProfile('browser-tts', 'es');
    const audio = buildPressureProfile('audio', 'de');
    const kokoro = buildPressureProfile('kokoro', 'de');
    const qwen = buildPressureProfile('qwen-cloud', 'de');

    expect(de.recommendation.targetRateRange).toEqual([0.8, 0.85]);
    expect(de.recommendation.targetPauseMs).toBe(1200);
    for (const profile of [en, es, audio, kokoro, qwen]) {
      expect(profile.recommendation.targetRateRange).not.toEqual([0.95, 1]);
      expect(profile.recommendation.summary).not.toContain('support-mode pressure remains high');
    }
  });

  it('clamps browser-tts DE runtime rates to the benchmark target range only', () => {
    const deProfile = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'de'),
      recommendation: {
        ...createEmptyInputLanguageBenchmark('browser-tts', 'de').recommendation,
        targetRateRange: [0.8, 0.85] as [number, number],
      },
    };
    const enProfile = {
      ...createEmptyInputLanguageBenchmark('browser-tts', 'en'),
      recommendation: {
        ...createEmptyInputLanguageBenchmark('browser-tts', 'en').recommendation,
        targetRateRange: [0.8, 0.85] as [number, number],
      },
    };
    const kokoroProfile = {
      ...createEmptyInputLanguageBenchmark('kokoro', 'de'),
      recommendation: {
        ...createEmptyInputLanguageBenchmark('kokoro', 'de').recommendation,
        targetRateRange: [0.8, 0.85] as [number, number],
      },
    };

    const highRateDecision = decision({ playbackRate: 0.93, replayRate: 0.9 });

    expect(clampBrowserTtsDeDecisionToRecommendation(highRateDecision, deProfile).playbackRate).toBe(0.86);
    expect(clampBrowserTtsDeDecisionToRecommendation(highRateDecision, deProfile).replayRate).toBe(0.86);
    expect(clampBrowserTtsDeDecisionToRecommendation(highRateDecision, enProfile).playbackRate).toBe(0.93);
    expect(clampBrowserTtsDeDecisionToRecommendation(highRateDecision, kokoroProfile).playbackRate).toBe(0.93);
  });

  it('ignores malformed browser-tts DE targetRateRange without throwing', () => {
    const highRateDecision = decision({ playbackRate: 0.93, replayRate: 0.9 });
    const malformedProfiles = [
      { ...createEmptyInputLanguageBenchmark('browser-tts', 'de'), recommendation: undefined },
      { ...createEmptyInputLanguageBenchmark('browser-tts', 'de'), recommendation: {} },
      {
        ...createEmptyInputLanguageBenchmark('browser-tts', 'de'),
        recommendation: { targetRateRange: [0.8] },
      },
      {
        ...createEmptyInputLanguageBenchmark('browser-tts', 'de'),
        recommendation: { targetRateRange: [0.9, 0.8] },
      },
      {
        ...createEmptyInputLanguageBenchmark('browser-tts', 'de'),
        recommendation: { targetRateRange: [0.8, Number.NaN] },
      },
    ] as unknown as InputLanguageBenchmarkMetrics[];

    for (const profile of malformedProfiles) {
      expect(() => clampBrowserTtsDeDecisionToRecommendation(highRateDecision, profile)).not.toThrow();
      expect(clampBrowserTtsDeDecisionToRecommendation(highRateDecision, profile)).toBe(highRateDecision);
    }
  });

  it('preserves existing browser-tts EN scoring behavior for clipped lag outliers', () => {
    let profile = createEmptyInputLanguageBenchmark('browser-tts', 'en');
    const base = Date.now();
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'en', lagSec: 0.3, rawLagSec: 0.3, stableLagSec: 0.3 }),
      decision: decision(),
      timestampMs: base + 1000,
    });
    profile = updateInputLanguageBenchmark({
      current: profile,
      live: live({ language: 'en', lagSec: -5, rawLagSec: -91.6, stableLagSec: -5 }),
      decision: decision(),
      timestampMs: base + 2000,
    });

    expect(profile.sampleCount).toBe(2);
    expect(profile.rawAverageLagSec).toBeLessThan(-40);
    expect(profile.stableAverageLagSec).toBeLessThan(-2);
    expect(profile.lagOutlierCount).toBe(1);
    expect(profile.rateAccuracyBuckets[0]?.sampleCount).toBe(2);
  });
});
