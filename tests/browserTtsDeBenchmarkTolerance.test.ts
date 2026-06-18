import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { clampBrowserTtsDeDecisionToRecommendation } from '../src/core/adaptive/browserTtsDeBenchmarkDecision';
import {
  analyzeBrowserTtsDeTimelinePressure,
  applyBrowserTtsDeTimelinePressureFallback,
  deriveBrowserTtsDeTimelineWeakAreas,
} from '../src/core/adaptive/browserTtsDeBenchmarkPressure';
import {
  isValidBrowserTtsDeBenchmarkSample,
  isValidBrowserTtsDeSessionInsightSample,
} from '../src/core/adaptive/browserTtsDeBenchmarkSamples';
import type { AdaptiveTimelinePoint, InputLanguageBenchmarkMetrics, PacingDecision } from '../src/core/adaptive/types';

function createProfile(): InputLanguageBenchmarkMetrics {
  const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
  profile.sampleCount = 40;
  profile.sessionCount = 5;
  profile.recommendation = {
    targetRateRange: [0.95, 1.05],
    targetPhraseSize: 'medium',
    targetPauseMs: 900,
    nextTrainingFocus: ['steady German Browser TTS pacing'],
    confidence: 0.75,
    summary: 'Stable enough.',
  };
  return profile;
}

function point(index: number, overrides: Partial<AdaptiveTimelinePoint> = {}): AdaptiveTimelinePoint {
  return {
    timestampMs: index + 1,
    inputMode: 'browser-tts',
    language: 'de',
    mode: 'balanced',
    playbackRate: 0.96,
    accuracy: 0.9,
    lagSec: 0.48,
    rawLagSec: 0.48,
    stableLagSec: 0.48,
    wpm: 42,
    pauseMs: 900,
    phraseBoundaryType: 'clause',
    semanticCompleteness: 0.82,
    phraseIndex: index,
    totalSemanticPhrases: 20,
    event: 'phrase_completed',
    ...overrides,
  };
}

function decision(overrides: Partial<PacingDecision> = {}): PacingDecision {
  return {
    mode: 'balanced',
    playbackRate: 1,
    pauseAfterPhraseMs: 900,
    shouldPauseNow: false,
    shouldReplayPhrase: false,
    boundaryStrictness: 'clause',
    allowMidPhrasePause: false,
    deferPauseUntilSafeBoundary: false,
    replayRate: 0.95,
    nextPhraseSize: 'medium',
    reason: 'mode=balanced',
    ...overrides,
  };
}

describe('Browser TTS DE benchmark tolerance', () => {
  it('does not turn support-heavy history into support_dependency without current learner pressure', () => {
    const profile = createProfile();
    profile.timeline = Array.from({ length: 5 }, (_, index) =>
      point(index, {
        mode: 'support',
        event: 'support_entered',
        decisionReason: 'support-needed',
      }),
    );

    const pressure = analyzeBrowserTtsDeTimelinePressure(profile);

    expect(pressure.supportRatio).toBe(1);
    expect(pressure.highLagRatio).toBe(0);
    expect(pressure.lowAccuracyRatio).toBe(0);
    expect(pressure.hasLearnerRecoveryPressure).toBe(false);
    expect(deriveBrowserTtsDeTimelineWeakAreas(pressure)).not.toContain('support_dependency');
  });

  it('keeps severe repeated learner pressure protective through pauses and an upper rate cap', () => {
    const profile = createProfile();
    profile.timeline = Array.from({ length: 5 }, (_, index) =>
      point(index, {
        mode: 'support',
        accuracy: 0.72,
        lagSec: 3.4,
        rawLagSec: 3.4,
        stableLagSec: 3.4,
        decisionReason: 'browser-tts-de-recovery-severe,support-needed',
      }),
    );

    const pressure = analyzeBrowserTtsDeTimelinePressure(profile);
    const adjusted = applyBrowserTtsDeTimelinePressureFallback(profile);

    expect(pressure.hasLearnerRecoveryPressure).toBe(true);
    expect(deriveBrowserTtsDeTimelineWeakAreas(pressure)).toContain('support_dependency');
    expect(adjusted.recommendation.targetRateRange).toEqual([0.7, 0.88]);
    expect(adjusted.recommendation.targetPauseMs).toBe(2600);
    expect(adjusted.recommendation.targetPhraseSize).toBe('short');
  });

  it('does not clamp clean current DE sessions back into a narrow historical recovery band', () => {
    const profile = createProfile();
    profile.weakAreas = ['lag', 'support_dependency'];
    profile.recommendation = {
      ...profile.recommendation,
      targetRateRange: [0.8, 0.85],
    };
    profile.timeline = [
      point(0),
      point(1),
      point(2),
    ];

    const unclamped = decision({ playbackRate: 1, replayRate: 0.95 });

    expect(clampBrowserTtsDeDecisionToRecommendation(unclamped, profile)).toEqual(unclamped);
  });

  it('uses stable fallback DE samples for session insight without admitting them to benchmark scoring', () => {
    const profile = createProfile();
    profile.sampleCount = 5;
    profile.timeline = Array.from({ length: 5 }, (_, index) =>
      point(index, {
        mode: 'support',
        rawLagSec: 12 + index,
        stableLagSec: 0.42,
        lagSec: 0.42,
        lagFallbackUsed: true,
        trend: 'improving',
        event: 'phrase_completed',
        decisionReason: 'support-needed, invalid-lag-alignment',
      }),
    );
    const sample = profile.timeline[0];

    expect(isValidBrowserTtsDeBenchmarkSample(sample)).toBe(false);
    expect(isValidBrowserTtsDeSessionInsightSample(sample)).toBe(true);

    const pressure = analyzeBrowserTtsDeTimelinePressure(profile);
    const adjusted = applyBrowserTtsDeTimelinePressureFallback(profile);

    expect(pressure.validScoringSampleCount).toBe(0);
    expect(pressure.sessionInsightSampleCount).toBe(5);
    expect(pressure.sessionInsightFallbackSampleCount).toBe(5);
    expect(pressure.hasRecentCleanSessionInsightSamples).toBe(true);
    expect(pressure.hasLearnerRecoveryPressure).toBe(false);
    expect(adjusted.recommendation.targetRateRange).toEqual([0.95, 1]);
    expect(adjusted.recommendation.targetPauseMs).toBe(900);
  });
});
