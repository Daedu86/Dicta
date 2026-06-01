import type { SupportedLanguage } from './languages';

export type KokoroLanguage = SupportedLanguage;
export type KokoroProcessedLanguage = 'en' | 'es';

export const KOKORO_GERMAN_WARNING =
  'German is not natively supported by Kokoro. Use browser TTS/Input 2 for German, or enable an experimental fallback.';
export const KOKORO_FRENCH_WARNING =
  'French is not natively supported by Kokoro in this setup. Use browser TTS/Input 2 for French, or enable an experimental fallback.';
export const KOKORO_PORTUGUESE_WARNING =
  'Portuguese is not natively supported by Kokoro in this setup. Use browser TTS/Input 2 for Portuguese, or enable an experimental fallback.';

export function isKokoroNativeLanguage(language: KokoroLanguage | null | undefined): language is KokoroProcessedLanguage {
  return language === 'en' || language === 'es';
}

export function getKokoroProcessedLanguage(language: KokoroLanguage | null | undefined): KokoroProcessedLanguage | null {
  if (language === 'en' || language === 'es') {
    return language;
  }
  return null;
}

export function isKokoroLanguageBlocked(language: KokoroLanguage | null | undefined): boolean {
  return language === 'de' || language === 'fr' || language === 'pt';
}

export function getKokoroLanguageWarning(language: KokoroLanguage | null | undefined): string {
  if (language === 'de') return KOKORO_GERMAN_WARNING;
  if (language === 'fr') return KOKORO_FRENCH_WARNING;
  if (language === 'pt') return KOKORO_PORTUGUESE_WARNING;
  return '';
}
