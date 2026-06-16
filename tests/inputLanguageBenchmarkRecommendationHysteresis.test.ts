import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  applyRecommendationHysteresis,
} from '../src/core/adaptive/inputLanguageBenchmarkRecommendation';
import type { InputLanguageBenchmarkMetrics, InputLanguageBenchmarkRecommendation } from '../src/core/adaptive/types';

function buildProfile(inputMode: InputLanguageBenchmarkMetrics['inputMode'], language: string): InputLanguageBenchmarkMetrics {
  const profile = createEmptyInputLanguageBenchmark(inputMode, language);
  profile.sampleCount = 48;
  profile.preferredPlaybackRate = 1;
  profile.preferredPhraseSize = 'medium';
  profile.preferredPauseAfterPhraseMs = 650;
  profile.averageAccuracy = 0.88;
  profile.averageLagSec = 0.8;
  profile.stableAverageLagSec = 0.8;
  profile.p75LagSec = 0.9;
  profile.p90AbsLagSec = 1.3;
  profile.weakAreas = [];
  return profile;
}

function buildRecommendation(overrides: Partial<InputLanguageBenchmarkRecommendation> = {}): InputLanguageBenchmarkRecommendation {
  return {
    targetRateRange: [0.92, 1.04],
    targetPhraseSize: 'medium',
    targetPauseMs: 700,
    nextTrainingFocus: ['Maintain stable pace'],
    confidence: 0.8,
    summary: 'Stable benchmark.',
    ...overrides,
  };
}

describe('applyRecommendationHysteresis', () => {
  it('keeps low-confidence browser-tts/de recommendations from speeding up and pushes recovery-safe values', () => {
    const profile = buildProfile('browser-tts', 'de');
    profile.preferredPlaybackRate = 1.05;
    profile.preferredPhraseSize = 'medium';
    profile.weakAreas = ['lag', 'low_accuracy', 'unsafe_boundary_pressure', 'flow_instability', 'support_dependency'];

    const recommendation = applyRecommendationHysteresis(
      profile,
      buildRecommendation({
        targetRateRange: [1.02, 1.08],
        targetPhraseSize: 'long',
        targetPauseMs: 700,
        confidence: 0.3,
      }),
    );

    expect(recommendation.targetRateRange[1]).toBeLessThanOrEqual(0.95);
    expect(recommendation.targetPhraseSize).toBe('short');
    expect(recommendation.targetPauseMs).toBeGreaterThanOrEqual(900);
  });

  it('keeps low-confidence phrase size at or below the preferred size', () => {
    const profile = buildProfile('browser-tts', 'fr');
    profile.preferredPhraseSize = 'short';

    const recommendation = applyRecommendationHysteresis(
      profile,
      buildRecommendation({
        targetPhraseSize: 'medium',
        confidence: 0.2,
      }),
    );

    expect(recommendation.targetPhraseSize).toBe('short');
  });

  it('bounds medium-confidence movement to a small rate window and one phrase-size step', () => {
    const profile = buildProfile('browser-tts', 'es');
    profile.preferredPlaybackRate = 0.95;
    profile.preferredPhraseSize = 'short';

    const recommendation = applyRecommendationHysteresis(
      profile,
      buildRecommendation({
        targetRateRange: [0.82, 1.08],
        targetPhraseSize: 'long',
        confidence: 0.5,
      }),
    );

    expect(recommendation.targetRateRange[0]).toBeCloseTo(0.91, 2);
    expect(recommendation.targetRateRange[1]).toBeLessThanOrEqual(0.99);
    expect(recommendation.targetPhraseSize).toBe('medium');
  });

  it('leaves stable high-confidence browser-tts/en recommendations unchanged', () => {
    const profile = buildProfile('browser-tts', 'en');
    profile.averageAccuracy = 0.93;
    profile.averageLagSec = 0.4;
    profile.stableAverageLagSec = 0.4;
    profile.p75LagSec = 0.5;
    profile.p90AbsLagSec = 0.7;
    profile.weakAreas = [];
    profile.preferredPlaybackRate = 1;
    profile.preferredPhraseSize = 'medium';

    const base = buildRecommendation({
      targetRateRange: [0.95, 1.05],
      targetPhraseSize: 'medium',
      targetPauseMs: 650,
      confidence: 0.82,
    });
    const recommendation = applyRecommendationHysteresis(profile, base);

    expect(recommendation).toEqual(base);
  });
});
