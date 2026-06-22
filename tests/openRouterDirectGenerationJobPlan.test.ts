import { describe, expect, it } from 'vitest';
import { buildOpenRouterDirectGenerationJobPlan } from '../src/app/openRouterDirectGenerationJobPlan';
import { OPEN_ROUTER_DIRECT_GENERATION_PRESETS } from '../src/app/openRouterDirectGenerationPresets';

describe('buildOpenRouterDirectGenerationJobPlan', () => {
  it('uses the adaptive preset for direct session generation', () => {
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.id).toBe('adaptive');
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.targetDifficulty).toBe('hard');
  });

  it('builds a three-minute adaptive prompt without topic context', () => {
    const plan = buildPlan('adaptive');

    expect(plan.jobRequestBody.durationMinutes).toBe(3);
    expect(plan.jobRequestBody.maxTokens).toBe(3800);
    expect(plan.activeJobDraft.durationMinutes).toBe(3);
    expect(plan.prompt).toContain('Target voice playback duration: 3 minutes; set "estimatedDurationSec" close to 180.');
    expect(plan.prompt).toContain('Combined spoken phrase text: 398-515 words, approximately 468 words total.');
    expect(plan.prompt).toContain('Create at least 30 phrases');
    expect(plan.prompt).not.toContain('User topic context:');
  });

  it('builds a three-minute topic prompt with user context', () => {
    const plan = buildPlan('topic', 'everyday errands in Berlin');

    expect(plan.jobRequestBody.durationMinutes).toBe(3);
    expect(plan.jobRequestBody.maxTokens).toBe(3800);
    expect(plan.prompt).toContain('Target voice playback duration: 3 minutes; set "estimatedDurationSec" close to 180.');
    expect(plan.prompt).toContain('User topic context:');
    expect(plan.prompt).toContain('everyday errands in Berlin');
  });
});

function buildPlan(presetKey: keyof typeof OPEN_ROUTER_DIRECT_GENERATION_PRESETS, topicContext?: string) {
  return buildOpenRouterDirectGenerationJobPlan({
    model: 'openrouter/free',
    preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS[presetKey],
    inputMode: 'browser-tts',
    language: 'en',
    sessions: [],
    adaptiveBenchmarksByInputLanguage: {},
    adaptiveSessionFeedbackByInputLanguage: {},
    recentDictationSessionHints: [],
    generationStartedAt: '2026-06-22T16:00:00.000Z',
    topicContext,
  });
}
