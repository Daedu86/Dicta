import { describe, expect, it } from 'vitest';
import {
  getKokoroLanguageWarning,
  getKokoroProcessedLanguage,
  isKokoroLanguageBlocked,
  isKokoroNativeLanguage,
} from '../src/core/kokoroSupport';

describe('kokoro language support', () => {
  it('treats Portuguese as experimental and non-native', () => {
    expect(isKokoroNativeLanguage('pt')).toBe(false);
    expect(getKokoroProcessedLanguage('pt')).toBeNull();
    expect(isKokoroLanguageBlocked('pt')).toBe(true);
    expect(getKokoroLanguageWarning('pt')).toContain('Portuguese is not natively supported');
  });

  it('keeps English and Spanish native', () => {
    expect(isKokoroNativeLanguage('en')).toBe(true);
    expect(isKokoroNativeLanguage('es')).toBe(true);
    expect(isKokoroLanguageBlocked('en')).toBe(false);
    expect(isKokoroLanguageBlocked('es')).toBe(false);
  });
});
