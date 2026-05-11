import { describe, expect, it } from 'vitest';
import { createEmptyInputLanguageBenchmark } from '../src/core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from '../src/core/adaptive/dictationScriptPrompt';

describe('dictationScriptPrompt', () => {
  it('includes selected input mode and language', () => {
    const profile = createEmptyInputLanguageBenchmark('kokoro', 'en');
    const prompt = buildDictationScriptPrompt(profile);

    expect(prompt).toContain('inputMode: kokoro');
    expect(prompt).toContain('language: en');
  });

  it('enforces JSON-only output', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'es');
    const prompt = buildDictationScriptPrompt(profile);

    expect(prompt).toContain('Output ONLY valid JSON');
    expect(prompt).toContain('Do not output markdown');
    expect(prompt).toContain('Do not wrap the JSON in code fences');
  });

  it('includes weak areas and recommendation context', () => {
    const profile = createEmptyInputLanguageBenchmark('qwen-cloud', 'de');
    profile.weakAreas = ['punctuation', 'lag'];
    profile.recommendation = {
      targetRateRange: [0.92, 0.98],
      targetPhraseSize: 'medium',
      targetPauseMs: 850,
      nextTrainingFocus: ['punctuation', 'medium clauses'],
      confidence: 0.7,
      summary: 'Focus on stable medium clauses.',
    };

    const prompt = buildDictationScriptPrompt(profile);

    expect(prompt).toContain('weakAreas');
    expect(prompt).toContain('punctuation');
    expect(prompt).toContain('recommendation');
    expect(prompt).toContain('targetRateRange');
    expect(prompt).toContain('targetPhraseSize: medium');
    expect(prompt).toContain('targetPauseMs: 850');
  });

  it('builds a valid sample output template for an input and language', () => {
    const template = buildDictationScriptTemplate('kokoro', 'en');
    const parsed = JSON.parse(template);

    expect(parsed.title).not.toBe('Generated Dictation');
    expect(parsed.inputMode).toBe('kokoro');
    expect(parsed.language).toBe('en');
    expect(Array.isArray(parsed.phrases)).toBe(true);
    expect(parsed.phrases.length).toBeGreaterThan(0);
  });

  it('tells the model to create a specific non-generic title', () => {
    const profile = createEmptyInputLanguageBenchmark('browser-tts', 'de');
    const prompt = buildDictationScriptPrompt(profile);

    expect(prompt).toContain('Set "title" to a short, specific');
    expect(prompt).toContain('Do not use generic titles');
    expect(prompt).toContain('expected voice/audio playback duration');
    expect(prompt).toContain('Generated Dictation');
  });

  it('includes required fields on the first sample phrase', () => {
    const parsed = JSON.parse(buildDictationScriptTemplate('browser-tts', 'es'));
    const phrase = parsed.phrases[0];

    expect(phrase).toMatchObject({
      id: 'p01',
      text: '',
      boundaryType: 'clause',
      pauseAfterMs: 600,
      canReplayIndependently: true,
      requiresContinuation: false,
      semanticCompleteness: 0.8,
      difficulty: 0.6,
      intonationHint: 'neutral',
    });
    expect(Array.isArray(phrase.emphasisWords)).toBe(true);
  });
});
