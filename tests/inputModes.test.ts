import { describe, expect, it } from 'vitest';
import {
  formatInputModeLabel,
  isCanonicalInputMode,
  isStoredInputMode,
  normalizeInputMode,
} from '../src/core/adaptive/inputModes';

describe('inputModes', () => {
  it('keeps removed Input 4 aliases from normalizing into active modes', () => {
    expect(isCanonicalInputMode('browser-tts')).toBe(true);
    expect(isCanonicalInputMode('kokoro')).toBe(true);
    expect(isCanonicalInputMode('cosyvoice-cache')).toBe(true);
    expect(isCanonicalInputMode('qwen-cloud')).toBe(false);
    expect(isStoredInputMode('qwen-cloud')).toBe(true);
    expect(normalizeInputMode('qwen-cloud')).toBeNull();
    expect(normalizeInputMode('cosyvoice-cache')).toBeNull();
    expect(formatInputModeLabel('qwen-cloud')).toBe('Unknown input');
  });
});
