export type KokoroLanguage = 'en' | 'de' | 'es';
export type KokoroProcessedLanguage = 'en' | 'es';

export const KOKORO_GERMAN_WARNING =
  'German is not natively supported by Kokoro. Use browser TTS/Input 2 for German, or enable an experimental fallback.';

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
  return language === 'de';
}

export function getKokoroLanguageWarning(language: KokoroLanguage | null | undefined): string {
  return isKokoroLanguageBlocked(language) ? KOKORO_GERMAN_WARNING : '';
}

