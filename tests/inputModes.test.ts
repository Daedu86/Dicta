import { describe, expect, it } from 'vitest';
import {
  formatInputModeLabel,
  isCanonicalInputMode,
  isStoredInputMode,
  normalizeInputMode,
} from '../src/core/adaptive/inputModes';

describe('input modes', () => {
  it('recognizes only active two-input modes', () => {
    expect(isCanonicalInputMode('browser-tts')).toBe(true);
    expect(isCanonicalInputMode('kokoro')).toBe(true);
    expect(isCanonicalInputMode('cosyvoice-cache')).toBe(false);
    expect(isCanonicalInputMode('qwen-cloud')).toBe(false);

    expect(isStoredInputMode('browser-tts')).toBe(true);
    expect(isStoredInputMode('kokoro')).toBe(true);
    expect(isStoredInputMode('qwen-cloud')).toBe(false);

    expect(normalizeInputMode('browser-tts')).toBe('browser-tts');
    expect(normalizeInputMode('kokoro')).toBe('kokoro');
    expect(normalizeInputMode('qwen-cloud')).toBeNull();
    expect(normalizeInputMode('cosyvoice-cache')).toBeNull();

    expect(formatInputModeLabel('browser-tts')).toBe('Browser TTS');
    expect(formatInputModeLabel('kokoro')).toBe('Kokoro');
    expect(formatInputModeLabel('qwen-cloud')).toBe('Unknown input');
  });
});
