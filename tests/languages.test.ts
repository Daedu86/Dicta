import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_LABELS,
  LANGUAGE_TAB_LABELS,
  SUPPORTED_LANGUAGES,
  formatSupportedLanguage,
  getDefaultSpeechSynthesisLang,
  isSupportedLanguage,
} from '../src/core/languages';

describe('supported languages', () => {
  it('includes Portuguese as a first-class language', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'es', 'de', 'fr', 'pt']);
    expect(isSupportedLanguage('pt')).toBe(true);
    expect(LANGUAGE_LABELS.pt).toBe('Portuguese');
    expect(LANGUAGE_TAB_LABELS.pt).toBe('PT');
  });

  it('uses Brazilian Portuguese as the default speech synthesis locale', () => {
    expect(getDefaultSpeechSynthesisLang('pt')).toBe('pt-BR');
    expect(formatSupportedLanguage('pt')).toBe('Portuguese');
  });
});
