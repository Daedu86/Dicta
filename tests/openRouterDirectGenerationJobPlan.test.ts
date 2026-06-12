import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { InputLanguageBenchmarkMetrics } from '../src/core/adaptive/types';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../src/components/openrouter/types';
import { buildOpenRouterDirectGenerationJobPlan } from '../src/app/openRouterDirectGenerationJobPlan';
import {
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from '../src/app/openRouterDirectGenerationPresets';

const generationStartedAt = '2026-06-12T10:00:00.000Z';

afterEach(() => {
  vi.unstubAllGlobals();
});

function createStableProfile(language: BenchmarkLanguageButton = 'de'): InputLanguageBenchmarkMetrics {
  const profile = createEmptyInputLanguageBenchmark('browser-tts', language);
  profile.sessionCount = 12;
  profile.sampleCount = 48;
  profile.averageAccuracy = 0.86;
  profile.averageLagSec = 0.8;
  profile.stableAverageLagSec = 0.8;
  profile.p75LagSec = 0.9;
  profile.p90AbsLagSec = 1.4;
  profile.averageWpm = 52;
  profile.flowStabilityScore = 0.84;
  profile.learningEffectivenessScore = 0.62;
  profile.sweetSpotScore = 0.78;
  profile.preferredPlaybackRate = 1;
  profile.preferredPhraseSize = 'medium';
  profile.preferredPauseAfterPhraseMs = 650;
  profile.weakAreas = [];
  profile.recommendation = {
    targetRateRange: [0.95, 1.05],
    targetPhraseSize: 'medium',
    targetPauseMs: 650,
    nextTrainingFocus: ['Maintain stable semantic phrases'],
    confidence: 0.82,
    summary: 'Stable profile.',
  };
  return profile;
}

function createBenchmarks(profile: InputLanguageBenchmarkMetrics): AdaptiveBenchmarksByInputLanguage {
  return {
    [profile.inputMode]: {
      [profile.language]: profile,
    },
  };
}

function createFeedback(language: BenchmarkLanguageButton = 'de'): AdaptiveSessionFeedbackByInputLanguage {
  return {
    'browser-tts': {
      [language]: [],
    },
  };
}

function createPlan(preset: OpenRouterDirectGenerationPreset) {
  const language: BenchmarkLanguageButton = 'en';
  const profile = createStableProfile(language);
  return buildOpenRouterDirectGenerationJobPlan({
    model: 'openrouter/free',
    preset,
    inputMode: 'browser-tts',
    language,
    sessions: [],
    adaptiveBenchmarksByInputLanguage: createBenchmarks(profile),
    adaptiveSessionFeedbackByInputLanguage: createFeedback(language),
    recentDictationSessionHints: [],
    generationStartedAt,
  });
}

describe('buildOpenRouterDirectGenerationJobPlan', () => {
  it('builds stable direct job request bodies for standard easy, medium, and hard presets', () => {
    const cases = [
      [OPEN_ROUTER_DIRECT_GENERATION_PRESETS.easy, 'easy'],
      [OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium, 'normal'],
      [OPEN_ROUTER_DIRECT_GENERATION_PRESETS.hard, 'hard'],
    ] as const;

    for (const [preset, expectedDifficulty] of cases) {
      const plan = createPlan(preset);

      expect(plan.slotLabel).toBe(preset.slotLabel);
      expect(plan.displayLabel).toBe(preset.displayLabel);
      expect(plan.targetMaxTokens).toBe(2_600);
      expect(plan.prompt.trim()).not.toBe('');
      expect(plan.prompt).toContain('Generate the next Dicta dictation training session.');
      expect(plan.jobRequestBody).toMatchObject({
        model: 'openrouter/free',
        prompt: plan.prompt,
        maxTokens: 2_600,
        slotLabel: preset.slotLabel,
        inputMode: 'browser-tts',
        language: 'en',
        durationMinutes: 2,
        targetDifficulty: expectedDifficulty,
      });
      expect(plan.activeJobDraft).toMatchObject({
        model: 'openrouter/free',
        slotLabel: preset.slotLabel,
        inputMode: 'browser-tts',
        language: 'en',
        durationMinutes: 2,
        targetDifficulty: expectedDifficulty,
        promptMode: 'compact-adaptive-v2',
        promptCharacterCount: plan.prompt.length,
        promptApproximateTokenCount: Math.max(1, Math.round(plan.prompt.length / 4)),
        origin: 'direct-training',
        startedAt: generationStartedAt,
      });
      expect('jobId' in plan.activeJobDraft).toBe(false);
    }
  });

  it('respects express duration and max token sizing', () => {
    const plan = createPlan(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressEasy);

    expect(plan.targetMaxTokens).toBe(1_800);
    expect(plan.jobRequestBody).toMatchObject({
      maxTokens: 1_800,
      slotLabel: 'Express easy direct session',
      durationMinutes: 1,
      targetDifficulty: 'easy',
    });
    expect(plan.activeJobDraft).toMatchObject({
      durationMinutes: 1,
      targetDifficulty: 'easy',
    });
  });

  it('does not execute fetch or other network side effects while planning', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    createPlan(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
