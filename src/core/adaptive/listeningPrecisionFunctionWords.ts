import type { ListeningPrecisionLanguage } from './listeningPrecisionMetricTypes';

const FUNCTION_WORDS_BY_LANGUAGE: Record<string, Set<string>> = {
  en: new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'because', 'but', 'by', 'for', 'from', 'if', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'then', 'there', 'this', 'to', 'with', 'without',
  ]),
  es: new Set([
    'a', 'al', 'ante', 'aunque', 'como', 'con', 'contra', 'de', 'del', 'desde', 'el', 'en', 'entre', 'esa', 'ese', 'esta', 'este', 'la', 'las', 'lo', 'los', 'o', 'para', 'pero', 'por', 'que', 'se', 'si', 'sin', 'sobre', 'un', 'una', 'y',
  ]),
  de: new Set([
    'aber', 'als', 'am', 'an', 'auf', 'aus', 'bei', 'bis', 'das', 'dem', 'den', 'der', 'des', 'die', 'ein', 'eine', 'einem', 'einen', 'einer', 'für', 'im', 'in', 'ist', 'mit', 'nach', 'oder', 'ohne', 'und', 'von', 'vor', 'weil', 'wenn', 'zu', 'zum', 'zur',
  ]),
  fr: new Set([
    'à', 'au', 'aux', 'avec', 'ce', 'cet', 'cette', 'dans', 'de', 'des', 'du', 'elle', 'en', 'est', 'et', 'il', 'la', 'le', 'les', 'mais', 'ou', 'par', 'pour', 'que', 'qui', 'sans', 'sur', 'un', 'une',
  ]),
  pt: new Set([
    'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'entre', 'esta', 'este', 'mas', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'por', 'que', 'sem', 'sobre', 'um', 'uma',
  ]),
};

export function resolveFunctionWords(language?: ListeningPrecisionLanguage | null): Set<string> {
  const normalized = typeof language === 'string' ? language.toLocaleLowerCase().split('-')[0] : '';
  return FUNCTION_WORDS_BY_LANGUAGE[normalized] ?? FUNCTION_WORDS_BY_LANGUAGE.en;
}
