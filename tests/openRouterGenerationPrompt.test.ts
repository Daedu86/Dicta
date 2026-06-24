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

  it('keeps duration budgets monotonic for slow recovery prompts while preserving trainer constraints', () => {
    const profile = unstableProfile();
    profile.recommendation = {
      targetRateRange: [0.66, 0.74],
      targetPhraseSize: 'short',
      targetPauseMs: 3265,
      nextTrainingFocus: ['Rebuild flow with short safe phrases'],
      confidence: 0.2,
      summary: 'Slow recovery profile.',
    };

    const budgets = ([2, 3, 4, 5, 6] as const).map((durationMinutes) => {
      const payload = buildOpenRouterGenerationPrompt({
        profile,
        sessionFeedback: null,
        promptSource: 'compact-adaptive-v2',
        durationMinutes,
        userIntent: 'recover',
        targetDifficulty: 'hard',
      });

      expect(payload.trainingPrescription.durationMinutes).toBe(durationMinutes);
      expect(payload.trainingPrescription.mode).toBe('recover');
      expect(payload.trainingPrescription.difficulty).toBe('easy');
      expect(payload.trainingPrescription.targetRateRange).toEqual([0.66, 0.74]);
      expect(payload.trainingPrescription.targetPhraseSize).toBe('short');
      expect(payload.trainingPrescription.targetPauseMs).toBe(3665);
      expect(payload.trainingPrescription.phraseDifficultyRange).toEqual([0.25, 0.45]);
      expect(payload.prompt).toContain(`Target voice playback duration: ${durationMinutes} minutes; set "estimatedDurationSec" close to ${durationMinutes * 60}.`);
      expect(payload.prompt).toContain('Set "difficulty" exactly to "easy".');
      expect(payload.prompt).toContain('Set "recommendedRateRange" to [0.66,0.74].');
      expect(payload.prompt).toContain('Set "recommendedPhraseSize" to "short".');
      expect(payload.prompt).toContain('Set "recommendedPauseMs" close to 3665.');
      expect(payload.prompt).toContain('Keep phrase-level "difficulty" values in 0.25-0.45.');
      expect(payload.prompt).not.toContain('"runtimePolicy"');
      expect(payload.prompt).not.toContain('"learningPolicy"');
      expect(payload.prompt).not.toContain('"rationale"');

      return extractPromptBudget(payload.prompt);
    });

    budgets.forEach((budget, index) => {
      const durationMinutes = index + 2;
      expect(budget.estimatedDurationSec).toBe(durationMinutes * 60);
      if (durationMinutes < 6) {
        expect(budget.minimumPhraseCount).toBe(durationMinutes * 10);
      }
      if (index === 0) return;
      expect(budget.targetSpokenWords).toBeGreaterThanOrEqual(budgets[index - 1].targetSpokenWords);
      expect(budget.minimumPhraseCount).toBeGreaterThanOrEqual(budgets[index - 1].minimumPhraseCount);
    });

    expect(budgets[4]).toMatchObject({
      minSpokenWords: 680,
      maxSpokenWords: 880,
      targetSpokenWords: 800,
      minimumPhraseCount: 51,
    });
    expect(budgets[4].targetSpokenWords).toBeGreaterThan(budgets[3].targetSpokenWords);
    expect(budgets[4].minimumPhraseCount).toBeGreaterThan(budgets[3].minimumPhraseCount);
    expect(budgets[4].targetSpokenWords / budgets[4].minimumPhraseCount).toBeCloseTo(
      budgets[3].targetSpokenWords / budgets[3].minimumPhraseCount,
      0,
    );
  });
});

function extractPromptBudget(prompt: string) {
  const durationMatch = prompt.match(/Target voice playback duration: \d+ minutes; set "estimatedDurationSec" close to (\d+)\./);
  const wordsMatch = prompt.match(/Combined spoken phrase text: (\d+)-(\d+) words, approximately (\d+) words total\./);
  const phrasesMatch = prompt.match(/Create at least (\d+) phrases/);

  expect(durationMatch).toBeTruthy();
  expect(wordsMatch).toBeTruthy();
  expect(phrasesMatch).toBeTruthy();

  return {
    estimatedDurationSec: Number(durationMatch?.[1]),
    minSpokenWords: Number(wordsMatch?.[1]),
    maxSpokenWords: Number(wordsMatch?.[2]),
    targetSpokenWords: Number(wordsMatch?.[3]),
    minimumPhraseCount: Number(phrasesMatch?.[1]),
  };
}
