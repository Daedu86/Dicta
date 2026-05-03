import { describe, expect, it } from 'vitest';
import { buildQwenCloudPhraseId } from '../src/inputs/qwenCloud/qwenCloudAudioAdapter';

function stablePhraseHash(value: string): string {
  let hash = 2166136261;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

describe('buildQwenCloudPhraseId', () => {
  it('matches stable hashing behavior used by the Colab notebook', () => {
    const language = 'en';
    const text = 'Welcome to Dicta, your adaptive dictation trainer.';
    const expected = `${language}:${stablePhraseHash(`${language}:${text}`)}`;
    expect(buildQwenCloudPhraseId(text, language)).toBe(expected);
  });
});

