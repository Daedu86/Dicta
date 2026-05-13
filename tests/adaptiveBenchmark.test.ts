import { describe, expect, it } from 'vitest';
import {
  clampBrowserTtsDeDecisionToRecommendation,
  computeBenchmarkRecommendation,
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
    expect(profile.weakAreas).toContain('lag');
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
    expect(profile.flowStabilityScore).toBe(1);
    expect(profile.sweetSpotScore).toBe(0);
    expect(profile.weakAreas).toEqual(expect.arrayContaining(['lag', 'unsafe_boundary_pressure']));
    expect(profile.weakAreas).not.toContain('low_accuracy');
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.3);
    expect(profile.recommendation.targetRateRange).toEqual([0.95, 1]);
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
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.3);
    expect(profile.recommendation.targetRateRange).toEqual([0.95, 1]);
  });

  it('keeps browser-tts DE recommendation conservative when playback is clean but timeline pressure is high', () => {
    const profile = buildBrowserTtsDePressureProfile();

    expect(profile.sampleCount).toBeLessThan(30);
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.3);
    expect(profile.recommendation.targetRateRange).toEqual([0.95, 1]);
    expect(profile.recommendation.targetPauseMs).toBe(1200);
    expect(profile.recommendation.targetPhraseSize).toBe('short');
    expect(profile.recommendation.nextTrainingFocus).toEqual(
      expect.arrayContaining(['accuracy stability', 'lag control', 'safe semantic boundaries', 'reduce support dependency']),
    );
    expect(profile.recommendation.summary).toContain('playback may be stable');
  });

  it('derives browser-tts DE pressure weak areas from support, unsafe boundaries, lag, and low accuracy', () => {
    const profile = buildBrowserTtsDePressureProfile();

    expect(profile.weakAreas).toEqual(
      expect.arrayContaining(['support_dependency', 'unsafe_boundary_pressure', 'lag', 'accuracy_instability']),
    );
  });

  it('does not allow severe browser-tts DE raw lag outliers to produce perfect flow readiness', () => {
    const profile = buildBrowserTtsDePressureProfile();

    expect(profile.timeline.some((point) => typeof point.rawLagSec === 'number' && point.rawLagSec < -10)).toBe(true);
    expect(profile.recommendation.targetRateRange).not.toEqual([1.05, 1.05]);
    expect(profile.recommendation.confidence).toBeLessThanOrEqual(0.3);
    expect(profile.weakAreas).toContain('lag');
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

    expect(de.recommendation.targetRateRange).toEqual([0.95, 1]);
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
