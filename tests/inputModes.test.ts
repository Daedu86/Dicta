import { describe, expect, it } from 'vitest';
import {
  formatInputModeLabel,
  isCanonicalInputMode,
  isStoredInputMode,
  normalizeInputMode,
} from '../src/core/adaptive/inputModes';

describe('inputModes', () => {
  it('keeps cosyvoice-cache canonical while accepting qwen-cloud as stored legacy input', () => {
    expect(isCanonicalInputMode('cosyvoice-cache')).toBe(true);
    expect(isCanonicalInputMode('qwen-cloud')).toBe(false);
    expect(isStoredInputMode('qwen-cloud')).toBe(true);
    expect(normalizeInputMode('qwen-cloud')).toBe('cosyvoice-cache');
    expect(normalizeInputMode('cosyvoice-cache')).toBe('cosyvoice-cache');
    expect(formatInputModeLabel('qwen-cloud')).toBe('CosyVoice cache');
  });
});
