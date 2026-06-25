import { describe, expect, it } from 'vitest';
import {
  buildDictationScriptFromCompactChunks,
  normalizeCompactChunks,
  normalizeOpenRouterScriptBuildPolicy,
  parseCompactOpenRouterChunksJson,
  type OpenRouterScriptBuildPolicy,
} from '../src/core/adaptive/openRouterGenerationPrompt';

const policy: OpenRouterScriptBuildPolicy = {
  inputMode: 'browser-tts',
  language: 'en',
  difficulty: 'normal',
  durationMinutes: 5,
  recommendedRateRange: [0.76, 0.8],
  recommendedPhraseSize: 'short',
  recommendedPauseMs: 2600,
  phraseDifficultyRange: [0.45, 0.65],
};

describe('OpenRouter compact chunks', () => {
  it('parses valid compact chunk JSON from provider prose', () => {
    const parsed = parseCompactOpenRouterChunksJson(
      `Reasoning removed.\n{"title":"Everyday observations","chunks":["Morning light arrives slowly.","The kitchen window reflects the street."]}`,
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.ok ? parsed.payload : null).toEqual({
      title: 'Everyday observations',
      chunks: ['Morning light arrives slowly.', 'The kitchen window reflects the street.'],
    });
  });

  it('cleans empty and exact duplicate chunks before planning', () => {
    expect(normalizeCompactChunks([
      '  The first train arrives early.  ',
      '',
      'The first train arrives early.',
      'Passengers check the platform number.',
    ])).toEqual([
      'The first train arrives early.',
      'Passengers check the platform number.',
    ]);
  });

  it('builds a complete DictationScript locally from compact chunks and policy', () => {
    const result = buildDictationScriptFromCompactChunks({
      title: 'Everyday observations',
      chunks: [
        'Morning light arrives slowly while the city begins to move.',
        'Neighbors open small windows, and quiet voices cross the courtyard.',
      ],
    }, policy);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.script).toMatchObject({
      title: 'Everyday observations',
      language: 'en',
      inputMode: 'browser-tts',
      difficulty: 'normal',
      estimatedDurationSec: 300,
      recommendedRateRange: [0.76, 0.8],
      recommendedPhraseSize: 'short',
      recommendedPauseMs: 2600,
    });
    expect(result.script.phrases.length).toBeGreaterThan(0);
    expect(result.script.phrases.every((phrase) => phrase.pauseAfterMs === 2600)).toBe(true);
    expect(result.script.phrases.every((phrase) => ['sentence', 'clause', 'minor', 'unsafe'].includes(phrase.boundaryType))).toBe(true);
  });

  it('splits long compact chunks with SemanticPhrasePlanner', () => {
    const result = buildDictationScriptFromCompactChunks({
      chunks: [
        'The community center opens early for language practice while volunteers arrange chairs near the windows and learners review yesterday notes before the first conversation begins in a calm room.',
      ],
    }, policy);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.script.phrases.length).toBeGreaterThan(1);
    expect(result.script.phrases[0].id).toBe('p01');
    expect(result.script.phrases[result.script.phrases.length - 1]?.intonationHint).toBe('falling');
  });

  it('normalizes untrusted script build policy values with safe fallbacks', () => {
    expect(normalizeOpenRouterScriptBuildPolicy({
      inputMode: 'browser-tts',
      language: 'pt',
      difficulty: 'hard',
      durationMinutes: 10,
      recommendedRateRange: [2.2, 0.05],
      recommendedPhraseSize: 'short',
      recommendedPauseMs: 2610.4,
      phraseDifficultyRange: [1.2, -0.3],
    }, policy)).toMatchObject({
      inputMode: 'browser-tts',
      language: 'pt',
      difficulty: 'hard',
      durationMinutes: 10,
      recommendedRateRange: [0.1, 2],
      recommendedPhraseSize: 'short',
      recommendedPauseMs: 2610,
      phraseDifficultyRange: [0, 1],
    });
  });
});
