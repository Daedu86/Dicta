import { describe, expect, it } from 'vitest';
import {
  extractJsonObjectText,
  normalizeDictationScript,
  parseDictationScriptJson,
  validateDictationScript,
} from '../src/core/adaptive/dictationScriptValidation';
import { validScript } from './dictationScriptValidation.fixtures';

describe('dictationScriptValidation', () => {
  it('parses and validates a valid script', () => {
    const result = parseDictationScriptJson(JSON.stringify(validScript));
    expect(result.ok).toBe(true);
    expect(result.ok ? result.script.title : '').toBe('Generated Dictation');
  });

  it('parses JSON wrapped in markdown fences', () => {
    const result = parseDictationScriptJson(`\n\n\`\`\`json\n${JSON.stringify(validScript)}\n\`\`\`\n`);
    expect(result.ok).toBe(true);
    expect(result.ok ? result.script.title : '').toBe('Generated Dictation');
  });

  it('parses JSON embedded in model prose', () => {
    const result = parseDictationScriptJson(`Here is the requested JSON:\n${JSON.stringify(validScript)}\nThanks.`);
    expect(result.ok).toBe(true);
    expect(result.ok ? result.script.phrases.length : 0).toBe(2);
  });

  it('skips non-script JSON objects before the generated script', () => {
    const result = parseDictationScriptJson(
      `Metadata first: ${JSON.stringify({ reasoning: 'draft', phrases: [] })}\nFinal JSON:\n${JSON.stringify(validScript)}`,
    );
    expect(result.ok).toBe(true);
    expect(result.ok ? result.script.title : '').toBe('Generated Dictation');
  });

  it('extracts a balanced JSON object without being confused by braces in strings', () => {
    const wrapped = `Intro { not json } ${JSON.stringify({ ...validScript, title: 'Use {braces} literally' })} outro`;
    expect(extractJsonObjectText(wrapped)).toContain('Use {braces} literally');
    const result = parseDictationScriptJson(wrapped);
    expect(result.ok ? result.script.title : '').toBe('Use {braces} literally');
  });

  it('parses generated JSON with trailing commas', () => {
    const sloppyJson = JSON.stringify(validScript, null, 2)
      .replace('"intonationHint": "falling"\n    }', '"intonationHint": "falling",\n    }')
      .replace(/\n}$/, ',\n}');
    const result = parseDictationScriptJson(`\`\`\`json\n${sloppyJson}\n\`\`\``);
    expect(result.ok).toBe(true);
    expect(result.ok ? result.script.phrases[0].text : '').toBe('This is the first phrase.');
  });

  it('parses double-encoded generated JSON strings', () => {
    const result = parseDictationScriptJson(JSON.stringify(JSON.stringify(validScript)));
    expect(result.ok).toBe(true);
    expect(result.ok ? result.script.language : '').toBe('en');
  });

  it('parses generated session JSON nested in a model wrapper string', () => {
    const result = parseDictationScriptJson(
      JSON.stringify({
        answer: 'valid session follows',
        session_json: JSON.stringify(validScript),
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.ok ? result.script.inputMode : '').toBe('browser-tts');
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

  it('fails removed legacy script modes', () => {
    const result = validateDictationScript({ ...validScript, inputMode: 'removed-legacy-input' });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('browser-tts');
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
