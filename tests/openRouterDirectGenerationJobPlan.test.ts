import { describe, expect, it } from 'vitest';
import { buildOpenRouterDirectGenerationJobPlan } from '../src/app/openRouterDirectGenerationJobPlan';
import { OPEN_ROUTER_DIRECT_GENERATION_PRESETS } from '../src/app/openRouterDirectGenerationPresets';
import type { OpenRouterDurationMinutes } from '../src/core/adaptive/openRouterGenerationPrompt';

describe('buildOpenRouterDirectGenerationJobPlan', () => {
  it('uses the adaptive preset for direct session generation', () => {
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.id).toBe('adaptive');
    expect(OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive.targetDifficulty).toBe('hard');
  });

  it('builds a three-minute adaptive prompt without topic context', () => {
    const plan = buildPlan('adaptive');

    expect(plan.jobRequestBody.durationMinutes).toBe(3);
    expect(plan.jobRequestBody.maxTokens).toBe(2400);
    expect(plan.jobRequestBody.generationFormat).toBe('compact-chunks-v1');
    expect(plan.jobRequestBody.scriptBuildPolicy).toMatchObject({
      inputMode: 'browser-tts',
      language: 'en',
      durationMinutes: 3,
    });
    expect(plan.activeJobDraft.generationFormat).toBe('compact-chunks-v1');
    expect(plan.activeJobDraft.durationMinutes).toBe(3);
    expect(plan.prompt).toContain('Required output shape: {"title":"short specific title","chunks":["semantic chunk one","semantic chunk two"]}.');
    expect(plan.prompt).toContain('Target voice playback duration: 3 minutes; Dicta will set duration metadata locally.');
    expect(plan.prompt).toContain('Combined spoken chunk text: 398-515 words, approximately 468 words total.');
    expect(plan.prompt).toContain('Create at least 30 chunks');
    expect(plan.prompt).not.toContain('boundaryType');
    expect(plan.prompt).not.toContain('pauseAfterMs');
    expect(plan.prompt).not.toContain('semanticCompleteness');
    expect(plan.prompt).not.toContain('User topic context:');
  });

  it('builds a three-minute topic prompt with user context', () => {
    const plan = buildPlan('topic', 'everyday errands in Berlin');

    expect(plan.jobRequestBody.durationMinutes).toBe(3);
    expect(plan.jobRequestBody.maxTokens).toBe(2400);
    expect(plan.prompt).toContain('Target voice playback duration: 3 minutes; Dicta will set duration metadata locally.');
    expect(plan.prompt).toContain('User topic context:');
    expect(plan.prompt).toContain('everyday errands in Berlin');
  });

  it('builds a six-minute context prompt and sends the preview prompt as the request body prompt', () => {
    const plan = buildPlan('topic', 'bank appointment vocabulary', 6);

    expect(plan.prompt).toBe(plan.jobRequestBody.prompt);
    expect(plan.jobRequestBody.durationMinutes).toBe(6);
    expect(plan.jobRequestBody.maxTokens).toBe(4200);
    expect(plan.activeJobDraft.durationMinutes).toBe(6);
    expect(plan.prompt).toContain('Target voice playback duration: 6 minutes; Dicta will set duration metadata locally.');
    expect(plan.prompt).toContain('Combined spoken chunk text: 796-1030 words, approximately 936 words total.');
    expect(plan.prompt).toContain('Create at least 60 chunks');
    expect(plan.prompt).toContain('bank appointment vocabulary');
  });

  it('builds a ten-minute context prompt with compact chunk output budget', () => {
    const plan = buildPlan('topic', 'train station announcements', 10);

    expect(plan.jobRequestBody.durationMinutes).toBe(10);
    expect(plan.jobRequestBody.maxTokens).toBe(6600);
    expect(plan.prompt).toContain('Target voice playback duration: 10 minutes; Dicta will set duration metadata locally.');
    expect(plan.prompt).toContain('Combined spoken chunk text: 1326-1716 words, approximately 1560 words total.');
    expect(plan.prompt).toContain('Create at least 100 chunks');
  });

  it('builds five-minute context prompts from real duration word targets', () => {
    const plan = buildPlan('topic', 'train station announcements', 5);

    expect(plan.jobRequestBody.durationMinutes).toBe(5);
    expect(plan.jobRequestBody.maxTokens).toBe(3600);
    expect(plan.prompt).toContain('Target voice playback duration: 5 minutes; Dicta will set duration metadata locally.');
    expect(plan.prompt).toContain('Combined spoken chunk text: 663-858 words, approximately 780 words total.');
    expect(plan.prompt).toContain('Create at least 50 chunks');
  });
});

function buildPlan(
  presetKey: keyof typeof OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  topicContext?: string,
  durationMinutes: OpenRouterDurationMinutes = OPEN_ROUTER_DIRECT_GENERATION_PRESETS[presetKey].durationMinutes,
) {
  return buildOpenRouterDirectGenerationJobPlan({
    model: 'openrouter/free',
    preset: {
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS[presetKey],
      durationMinutes,
    },
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
