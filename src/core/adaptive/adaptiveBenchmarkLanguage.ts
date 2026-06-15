import type { LanguageCode } from './types';

export function normalizeBenchmarkLanguage(language?: string | null): LanguageCode {
  return language && language.trim() ? language : 'unknown';
}
