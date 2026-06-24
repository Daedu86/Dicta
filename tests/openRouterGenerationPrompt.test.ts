import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildOpenRouterGenerationPrompt } from '../src/core/adaptive/openRouterGenerationPrompt';

function stableProfile() {
  const profile = createEmptyInputLanguageBenchmark('browser-tts', 'en');
  profile.sampleCount = 48;
  profile.averageAccuracy = 0.93;
  profile.averageLagSec = 0.4;
  profile.stableAverageLagSec = 0.4;
  profile.p75LagSec = 0.5;
  profile.p90AbsLagSec = 0.7;
  profile.sweetSpotScore = 0.82;
  profile.flowStabilityScore = 0.87;
  profile.learningEffectivenessScore = 0.68;
  profile.preferredPlaybackRate = 1;
  profile.preferredPhraseSize = 'medium';
  profile.preferredPauseAfterPhraseMs = 650;
  profile.weakAreas = [];
  profile.recommendation = {
    targetRateRange: [0.95, 1.05],
    targetPhraseSize: 'medium',
    targetPauseMs: 650,
    nextTrainingFocus: ['Maintain stable pace'],
    confidence: 0.82,
    summary: 'Stable EN profile.',
  };
  return profile;
}

function unstableProfile() {
  const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
  profile.sampleCount = 10;
  profile.averageAccuracy = 0.72;
  profile.averageLagSec = 3.6;
  profile.stableAverageLagSec = 3.4;
  profile.p75LagSec = 3.8;
  profile.p90AbsLagSec = 4.6;
  profile.sweetSpotScore = 0.22;
  profile.flowStabilityScore = 0.34;
  profile.learningEffectivenessScore = 0.2;
  profile.preferredPlaybackRate = 1.05;
  profile.preferredPhraseSize = 'medium';
  profile.preferredPauseAfterPhraseMs = 700;
  profile.weakAreas = ['lag', 'low_accuracy', 'unsafe_boundary_pressure', 'support_dependency', 'flow_instability'];
  profile.recommendation = {
    targetRateRange: [1.05, 1.1],
    targetPhraseSize: 'medium',
    targetPauseMs: 700,
    nextTrainingFocus: ['Recover DE browser TTS flow'],
    confidence: 0.22,
    summary: 'Unstable German browser TTS profile.',
  };
  return profile;
}

describe('buildOpenRouterGenerationPrompt', () => {
  it('includes adaptive policy constraints and nested trainingPrescription fields for stable browser-tts/en challenge prompts', () => {
    const payload = buildOpenRouterGenerationPrompt({
      profile: stableProfile(),
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 2,
      userIntent: 'challenge',
      targetDifficulty: 'hard',
    });

    expect(payload.prompt).toContain('Adaptive policy constraints:');
    expect(payload.prompt).toContain('Runtime policy:');
    expect(payload.prompt).toContain('Learning policy:');
    expect(payload.trainingPrescription.difficulty).toBe('hard');
    expect(payload.trainingPrescription.learningPolicy.difficulty).toBe('hard');
    expect(payload.trainingPrescription.runtimePolicy.boundaryPolicy).toBe('normal_semantic');
  });

  it('downgrades unstable browser-tts/de challenge prompts to recovery-safe constraints', () => {
    const payload = buildOpenRouterGenerationPrompt({
      profile: unstableProfile(),
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 2,
      userIntent: 'challenge',
      targetDifficulty: 'hard',
    });

    expect(payload.prompt).toContain('Adaptive policy constraints:');
    expect(payload.prompt).toContain('short safe semantic phrases');
    expect(payload.trainingPrescription.mode).toBe('recover');
    expect(payload.trainingPrescription.difficulty).toBe('easy');
    expect(payload.trainingPrescription.runtimePolicy.boundaryPolicy).toBe('strict_semantic');
    expect(payload.trainingPrescription.runtimePolicy.targetPhraseSize).toBe('short');
    expect(payload.trainingPrescription.learningPolicy.phrasePolicy).toBe('short_safe_semantic');
  });

  it('uses a runtime-aware smaller six-minute word budget for slow recovery prompts', () => {
    const profile = unstableProfile();
    profile.recommendation = {
      targetRateRange: [0.66, 0.74],
      targetPhraseSize: 'short',
      targetPauseMs: 3200,
      nextTrainingFocus: ['Rebuild flow with short safe phrases'],
      confidence: 0.2,
      summary: 'Slow recovery profile.',
    };

    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 6,
      userIntent: 'recover',
      targetDifficulty: 'hard',
    });

    expect(payload.prompt).toContain('Target voice playback duration: 6 minutes; set "estimatedDurationSec" close to 360.');
    expect(payload.prompt).toContain('Combined spoken phrase text: 382-494 words, approximately 449 words total.');
    expect(payload.prompt).toContain('Create at least 42 phrases');
    expect(payload.prompt).toContain('"targetPauseMs": 3600');
    expect(payload.prompt).not.toContain('"runtimePolicy"');
    expect(payload.prompt).not.toContain('"learningPolicy"');
    expect(payload.prompt).not.toContain('"rationale"');
    expect(payload.trainingPrescription.mode).toBe('recover');
    expect(payload.trainingPrescription.difficulty).toBe('easy');
  });
});
