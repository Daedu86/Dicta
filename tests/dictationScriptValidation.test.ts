import { describe, expect, it } from 'vitest';
import {
  normalizeDictationScript,
  parseDictationScriptJson,
  validateDictationScript,
  type DictationScript,
} from '../src/core/adaptive/dictationScriptValidation';

const validScript: DictationScript = {
  title: 'Generated Dictation',
  language: 'en',
  inputMode: 'kokoro',
  difficulty: 'normal',
  estimatedDurationSec: 90,
  targetSkills: [],
  recommendedRateRange: [0.9, 1],
  recommendedPhraseSize: 'medium',
  recommendedPauseMs: 600,
  phrases: [
    {
      id: 'p01',
      text: 'This is the first phrase.',
      boundaryType: 'sentence',
      pauseAfterMs: 600,
      canReplayIndependently: true,
      requiresContinuation: false,
      semanticCompleteness: 0.9,
      difficulty: 0.4,
      emphasisWords: [],
      intonationHint: 'falling',
    },
    {
      id: 'p02',
      text: 'This phrase stays second.',
      boundaryType: 'sentence',
      pauseAfterMs: 600,
      canReplayIndependently: true,
      requiresContinuation: false,
      semanticCompleteness: 0.85,
      difficulty: 0.45,
      emphasisWords: [],
      intonationHint: 'falling',
    },
  ],
};

describe('dictationScriptValidation', () => {
  it('parses and validates a valid script', () => {
    const result = parseDictationScriptJson(JSON.stringify(validScript));
    expect(result.ok).toBe(true);
    expect(result.ok ? result.script.title : '').toBe('Generated Dictation');
  });

  it('fails invalid JSON', () => {
    const result = parseDictationScriptJson('{bad');
    expect(result.ok).toBe(false);
  });

  it('fails missing phrases', () => {
    const result = validateDictationScript({ ...validScript, phrases: [] });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('phrases');
  });

  it('fails invalid boundaryType', () => {
    const result = validateDictationScript({
      ...validScript,
      phrases: [{ ...validScript.phrases[0], boundaryType: 'word' }],
    });
    expect(result.ok).toBe(false);
  });

  it('fails semanticCompleteness outside 0..1', () => {
    const result = validateDictationScript({
      ...validScript,
      phrases: [{ ...validScript.phrases[0], semanticCompleteness: 1.2 }],
    });
    expect(result.ok).toBe(false);
  });

  it('fails difficulty outside 0..1', () => {
    const result = validateDictationScript({
      ...validScript,
      phrases: [{ ...validScript.phrases[0], difficulty: -0.1 }],
    });
    expect(result.ok).toBe(false);
  });

  it('normalizes optional defaults', () => {
    const normalized = normalizeDictationScript({
      title: 'Defaulted',
      language: 'pt',
      inputMode: 'browser-tts',
      phrases: [
        {
          id: 'p01',
          text: 'Ola mundo.',
          boundaryType: 'sentence',
          pauseAfterMs: 600,
          canReplayIndependently: true,
          requiresContinuation: false,
          semanticCompleteness: 0.9,
          difficulty: 0.3,
        },
      ],
    });

    expect(normalized.recommendedPhraseSize).toBe('medium');
    expect(normalized.language).toBe('pt');
    expect(normalized.recommendedPauseMs).toBe(600);
    expect(normalized.recommendedRateRange).toEqual([0.9, 1]);
    expect(normalized.phrases[0].emphasisWords).toEqual([]);
    expect(normalized.phrases[0].intonationHint).toBe('neutral');
  });

  it('preserves phrase order', () => {
    const result = validateDictationScript(validScript);
    expect(result.ok ? result.script.phrases.map((phrase) => phrase.id) : []).toEqual(['p01', 'p02']);
  });
});
