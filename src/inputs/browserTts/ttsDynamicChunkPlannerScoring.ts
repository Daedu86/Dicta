import type { PhraseBoundaryType, PhraseSize } from '../../core/adaptive/types';
import type { BoundaryStrictness, SupportedLanguage } from './ttsDynamicChunkPlannerTypes';

const SENTENCE_END_RE = /[.!?]["')\]]*$/;
const CLAUSE_END_RE = /[,;:]["')\]]*$|--$|[–—]$/;

const DISCOURSE_MARKERS: Record<SupportedLanguage, string[]> = {
  en: ['and', 'but', 'because', 'however', 'therefore', 'then', 'so', 'while'],
  es: ['y', 'pero', 'porque', 'sin', 'embargo', 'entonces', 'asi', 'ademas', 'aunque'],
  de: ['und', 'aber', 'weil', 'doch', 'dann', 'deshalb', 'wahrend', 'obwohl'],
  fr: ['et', 'mais', 'parce', 'que', 'cependant', 'donc', 'alors', 'pendant', 'bien', 'que', 'quoique'],
  pt: ['e', 'mas', 'porque', 'porem', 'porém', 'entao', 'então', 'logo', 'portanto', 'alem', 'além', 'disso', 'embora'],
};

const UNSAFE_WORDS: Record<SupportedLanguage, string[]> = {
  en: ['a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being'],
  es: ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para', 'es', 'son', 'ser', 'estar', 'se'],
  de: ['der', 'die', 'das', 'ein', 'eine', 'zu', 'mit', 'von', 'im', 'am', 'ist', 'sind', 'war', 'sein', 'haben'],
  fr: ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux', 'a', 'en', 'avec', 'pour', 'par', 'est', 'sont', 'etre', 'se'],
  pt: ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'ao', 'aos', 'a', 'em', 'no', 'na', 'nos', 'nas', 'com', 'por', 'para', 'e', 'é', 'sao', 'são', 'ser', 'estar', 'se'],
};

const WORD_WEIGHTS = {
  punctuation: 0.15,
  rare: 0.35,
  syntax: 0.5,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizeWord(raw: string): string {
  return raw.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function boundaryFromToken(token: string): PhraseBoundaryType {
  if (SENTENCE_END_RE.test(token)) return 'sentence';
  if (CLAUSE_END_RE.test(token)) return 'clause';
  return 'minor';
}

export function boundaryScore(boundary: PhraseBoundaryType): number {
  if (boundary === 'sentence') return 3;
  if (boundary === 'clause') return 2;
  if (boundary === 'minor') return 1;
  return 0;
}

export function minimumBoundaryScore(strictness: BoundaryStrictness): number {
  if (strictness === 'sentence') return 3;
  if (strictness === 'clause') return 2;
  return 1;
}

export function targetWordsForSize(size: PhraseSize, germanShortBias: boolean): number {
  const base = size === 'short' ? 6 : size === 'long' ? 18 : 11;
  return germanShortBias ? Math.max(4, base - 2) : base;
}

export function isUnsafePair(leftWord: string, rightWord: string, language: SupportedLanguage): boolean {
  if (!leftWord || !rightWord) return false;
  const unsafe = UNSAFE_WORDS[language];
  if (unsafe.includes(leftWord)) return true;
  if (language === 'de' && /^(ge)?.+en$/.test(rightWord) && /^(hat|haben|hast|habe|wird|werden|wurde|wurden)$/.test(leftWord)) {
    return true;
  }
  if (language === 'es' && /^(me|te|se|lo|la|le|nos|os|los|las|les)$/.test(leftWord)) {
    return true;
  }
  if (language === 'fr' && /^(me|te|se|nous|vous|le|la|les|l|ne|n)$/.test(leftWord)) {
    return true;
  }
  if (language === 'pt' && /^(me|te|se|o|a|os|as|lhe|lhes|nos|vos|lo|la|los|las)$/.test(leftWord)) {
    return true;
  }
  return false;
}

export function scoreChunk(words: string[], language: SupportedLanguage, boundaryType: PhraseBoundaryType) {
  const cleanWords = words.map(normalizeWord).filter(Boolean);
  const wordCount = cleanWords.length;
  const text = words.join(' ');
  const charCount = text.length;
  const punctuationCount = words.filter((word) => /[.,;:!?-]/.test(word)).length;
  const punctuationLoad = wordCount > 0 ? punctuationCount / wordCount : 0;
  const rareWordLoad = wordCount > 0 ? cleanWords.filter((word) => word.length >= 10).length / wordCount : 0;
  const markerCount = cleanWords.filter((word) => DISCOURSE_MARKERS[language].includes(word)).length;
  const syntaxComplexity = clamp01((markerCount + punctuationCount * 0.5) / Math.max(1, wordCount / 2));
  const phraseDifficulty = clamp01(
    punctuationLoad * WORD_WEIGHTS.punctuation +
      rareWordLoad * WORD_WEIGHTS.rare +
      syntaxComplexity * WORD_WEIGHTS.syntax,
  );
  const completenessBase = boundaryType === 'sentence' ? 1 : boundaryType === 'clause' ? 0.82 : boundaryType === 'minor' ? 0.65 : 0.35;
  const semanticCompleteness = clamp01(completenessBase - Math.max(0, phraseDifficulty - 0.5) * 0.3);
  return {
    text,
    charCount,
    punctuationLoad,
    rareWordLoad,
    syntaxComplexity,
    phraseDifficulty,
    semanticCompleteness,
  };
}
