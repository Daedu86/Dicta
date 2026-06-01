import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildOpenRouterGenerationPrompt, estimateOpenRouterPromptSize } from '../src/core/adaptive/openRouterGenerationPrompt';

describe('OpenRouter prompt profile scoping', () => {
  it('pins compact adaptive v2 context to browser-tts/de and excludes neighboring profiles', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    profile.sessionCount = 4;
    profile.sampleCount = 32;
    profile.weakAreas = ['lag', 'flow_instability'];
    profile.recommendation = {
      targetRateRange: [0.79, 0.84],
      targetPhraseSize: 'short',
      targetPauseMs: 1200,
      nextTrainingFocus: ['lag', 'flow instability'],
      confidence: 0.7,
      summary: 'browser-tts/de focused recommendation',
    };

    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 2,
      targetDifficulty: 'normal',
    });

    expect(payload.prompt).toContain('inputMode "browser-tts"');
    expect(payload.prompt).toContain('language "de"');
    expect(payload.prompt).toContain('"profileKey": "browser-tts/de"');
    expect(payload.prompt).toContain('browser-tts/de focused recommendation');
    expect(payload.prompt).not.toContain('browser-tts/en');
    expect(payload.prompt).not.toContain('browser-tts/es');
    expect(payload.outputTemplate).toContain('"inputMode": "browser-tts"');
    expect(payload.outputTemplate).toContain('"language": "de"');
  });

  it('pins compact adaptive v2 context to audio/es without leaking browser-tts/de context', () => {
    const profile = createEmptyInputLanguageBenchmark('audio', 'es');
    profile.sessionCount = 2;
    profile.sampleCount = 8;
    profile.recommendation = {
      targetRateRange: [0.9, 1],
      targetPhraseSize: 'medium',
      targetPauseMs: 700,
      nextTrainingFocus: ['Spanish audio comprehension'],
      confidence: 0.5,
      summary: 'audio/es focused recommendation',
    };

    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-adaptive-v2',
      durationMinutes: 1,
    });

    expect(payload.prompt).toContain('Use exactly inputMode "audio" and language "es"');
    expect(payload.prompt).toContain('"profileKey": "audio/es"');
    expect(payload.prompt).toContain('audio/es focused recommendation');
    expect(payload.prompt).not.toContain('browser-tts/de');
    expect(payload.outputTemplate).toContain('"inputMode": "audio"');
    expect(payload.outputTemplate).toContain('"language": "es"');
  });

  it('estimates prompt size with the same profile metadata used to build the prompt', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const payload = buildOpenRouterGenerationPrompt({
      profile,
      sessionFeedback: null,
      promptSource: 'compact-benchmark-only',
      durationMinutes: 1,
    });

    const estimate = estimateOpenRouterPromptSize(payload.prompt, {
      promptMode: 'compact-benchmark-only',
      durationMinutes: 1,
      inputMode: profile.inputMode,
      language: profile.language,
    });

    expect(estimate.characterCount).toBe(payload.prompt.length);
    expect(estimate.approximateTokenCount).toBeGreaterThan(0);
    expect(estimate.inputMode).toBe('browser-tts');
    expect(estimate.language).toBe('de');
  });
});
