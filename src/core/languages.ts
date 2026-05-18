export const SUPPORTED_LANGUAGES = ['en', 'es', 'de', 'fr'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Spanish',
  de: 'German',
  fr: 'French',
};

export const LANGUAGE_TAB_LABELS: Record<SupportedLanguage, string> = {
  en: 'EN',
  es: 'ES',
  de: 'DE',
  fr: 'FR',
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

export function formatSupportedLanguage(language: string): string {
  return isSupportedLanguage(language) ? LANGUAGE_LABELS[language] : String(language).toUpperCase();
}

export function getDefaultSpeechSynthesisLang(language: SupportedLanguage): string {
  if (language === 'en') return 'en-US';
  if (language === 'es') return 'es-ES';
  if (language === 'fr') return 'fr-FR';
  return 'de-DE';
}
