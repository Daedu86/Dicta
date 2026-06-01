import type { PhraseBoundaryType, PhraseSize } from './types';

export interface SemanticPhrase {
  id: string;
  text: string;
  language?: string;
  boundaryType: PhraseBoundaryType;
  canPauseAfter: boolean;
  canReplayIndependently: boolean;
  semanticCompleteness: number;
  difficulty: number;
  wordCount: number;
  charCount: number;
  punctuationLoad: number;
  rareWordLoad: number;
  syntaxComplexity: number;
}

export interface SemanticPhrasePlaybackState {
  currentPhraseIndex: number;
  phraseAdvanceCount: number;
  phraseReplayCount: number;
  lastPhraseAdvanceReason: string;
}

const SENTENCE_END_RE = /[.!?]["')\]]*$/;
const CLAUSE_END_RE = /[,;:]["')\]]*$|--$|[–—]$/;
type PlannerLanguage = 'en' | 'es' | 'de' | 'fr' | 'pt';

const DISCOURSE_MARKERS: Record<PlannerLanguage, string[]> = {
  en: ['and', 'but', 'because', 'however', 'therefore', 'then', 'so', 'while'],
  es: ['y', 'pero', 'porque', 'sin', 'embargo', 'entonces', 'asi', 'ademas', 'aunque'],
  de: ['und', 'aber', 'weil', 'doch', 'dann', 'deshalb', 'wahrend', 'obwohl'],
  fr: ['et', 'mais', 'parce', 'que', 'cependant', 'donc', 'alors', 'pendant', 'bien', 'que', 'quoique'],
  pt: ['e', 'mas', 'porque', 'porem', 'porém', 'entao', 'então', 'logo', 'portanto', 'alem', 'além', 'disso', 'embora'],
};

const UNSAFE_WORDS: Record<PlannerLanguage, string[]> = {
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

function normalizeLanguage(language?: string): PlannerLanguage {
  if (language === 'es' || language === 'de' || language === 'fr' || language === 'pt') return language;
  return 'en';
}

function normalizeWord(raw: string): string {
  return raw.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function makeBoundaryType(word: string): PhraseBoundaryType {
  if (SENTENCE_END_RE.test(word)) return 'sentence';
  if (CLAUSE_END_RE.test(word)) return 'clause';
  return 'minor';
}

function isUnsafePair(leftWord: string, rightWord: string, language: PlannerLanguage): boolean {
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

function scorePhrase(words: string[], language: PlannerLanguage, boundaryType: PhraseBoundaryType): Omit<SemanticPhrase, 'id' | 'text' | 'language' | 'canPauseAfter' | 'canReplayIndependently'> {
  const cleanWords = words.map(normalizeWord).filter(Boolean);
  const wordCount = cleanWords.length;
  const text = words.join(' ');
  const charCount = text.length;
  const punctuationCount = words.filter((word) => /[.,;:!?-]/.test(word)).length;
  const punctuationLoad = wordCount > 0 ? punctuationCount / wordCount : 0;
  const rareWordLoad = wordCount > 0 ? cleanWords.filter((word) => word.length >= 10).length / wordCount : 0;
  const markerCount = cleanWords.filter((word) => DISCOURSE_MARKERS[language].includes(word)).length;
  const syntaxComplexity = clamp01((markerCount + punctuationCount * 0.5) / Math.max(1, wordCount / 2));
  const difficulty = clamp01(
    punctuationLoad * WORD_WEIGHTS.punctuation +
      rareWordLoad * WORD_WEIGHTS.rare +
      syntaxComplexity * WORD_WEIGHTS.syntax,
  );
  const completenessBase = boundaryType === 'sentence' ? 1 : boundaryType === 'clause' ? 0.82 : boundaryType === 'minor' ? 0.65 : 0.35;
  const semanticCompleteness = clamp01(completenessBase - Math.max(0, difficulty - 0.5) * 0.3);
  return {
    boundaryType,
    semanticCompleteness,
    difficulty,
    wordCount,
    charCount,
    punctuationLoad,
    rareWordLoad,
    syntaxComplexity,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function targetWordsForSize(size: PhraseSize): number {
  if (size === 'short') return 6;
  if (size === 'long') return 16;
  return 10;
}

export function planSemanticPhrases(text: string, language?: string, sizePreference: PhraseSize = 'medium'): SemanticPhrase[] {
  const normalizedLanguage = normalizeLanguage(language);
  const words = text.split(/\s+/).map((part) => part.trim()).filter(Boolean);
  if (words.length === 0) return [];
  const phrases: SemanticPhrase[] = [];
  const targetWords = targetWordsForSize(sizePreference);
  let start = 0;
  let phraseId = 0;

  while (start < words.length) {
    const scanLimit = Math.min(words.length - 1, start + targetWords + 8);
    const minTarget = Math.min(words.length - 1, start + Math.max(2, targetWords - 3));
    let cut = Math.min(words.length - 1, start + targetWords - 1);
    let bestBoundary: PhraseBoundaryType = 'unsafe';

    for (let i = minTarget; i <= scanLimit; i += 1) {
      const boundary = makeBoundaryType(words[i]);
      if (boundary === 'sentence') {
        cut = i;
        bestBoundary = boundary;
        break;
      }
      if (boundary === 'clause') {
        cut = i;
        bestBoundary = boundary;
      } else if (boundary === 'minor' && bestBoundary === 'unsafe') {
        cut = i;
        bestBoundary = boundary;
      }
    }

    const left = normalizeWord(words[cut] ?? '');
    const right = normalizeWord(words[cut + 1] ?? '');
    if (cut < words.length - 1 && isUnsafePair(left, right, normalizedLanguage)) {
      bestBoundary = 'unsafe';
    }
    if (cut >= words.length - 1) {
      bestBoundary = bestBoundary === 'unsafe' ? 'sentence' : bestBoundary;
    }

    const phraseWords = words.slice(start, cut + 1);
    const scores = scorePhrase(phraseWords, normalizedLanguage, bestBoundary);
    const canPauseAfter = bestBoundary === 'sentence' || bestBoundary === 'clause';
    const canReplayIndependently = canPauseAfter && scores.semanticCompleteness >= 0.65;
    phrases.push({
      id: `semantic-${phraseId}`,
      text: phraseWords.join(' '),
      language: normalizedLanguage,
      ...scores,
      canPauseAfter,
      canReplayIndependently,
    });
    phraseId += 1;
    start = cut + 1;
  }

  return phrases;
}

export function pickNextPhrase(
  candidates: SemanticPhrase[],
  phraseSize: PhraseSize,
  boundaryStrictness: 'sentence' | 'clause' | 'phrase',
): SemanticPhrase | null {
  if (candidates.length === 0) return null;
  const sizeTarget = targetWordsForSize(phraseSize);
  const minimumBoundary =
    boundaryStrictness === 'sentence' ? 3 : boundaryStrictness === 'clause' ? 2 : 1;
  const boundaryScore = (boundary: PhraseBoundaryType): number => {
    if (boundary === 'sentence') return 3;
    if (boundary === 'clause') return 2;
    if (boundary === 'minor') return 1;
    return 0;
  };
  let best = candidates[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const boundaryValue = boundaryScore(candidate.boundaryType);
    if (boundaryValue < minimumBoundary) continue;
    const sizePenalty = Math.abs(candidate.wordCount - sizeTarget) / Math.max(1, sizeTarget);
    const score = candidate.semanticCompleteness * 1.4 + boundaryValue * 0.25 - candidate.difficulty * 0.45 - sizePenalty * 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

export function createSemanticPhrasePlaybackState(): SemanticPhrasePlaybackState {
  return {
    currentPhraseIndex: 0,
    phraseAdvanceCount: 0,
    phraseReplayCount: 0,
    lastPhraseAdvanceReason: 'start',
  };
}

export function advanceSemanticPhrasePlayback(
  state: SemanticPhrasePlaybackState,
  totalPhrases: number,
  reason = 'phrase_complete',
): SemanticPhrasePlaybackState {
  return {
    ...state,
    currentPhraseIndex: Math.min(state.currentPhraseIndex + 1, Math.max(0, totalPhrases)),
    phraseAdvanceCount: state.phraseAdvanceCount + 1,
    lastPhraseAdvanceReason: reason,
  };
}

export function replaySemanticPhrasePlayback(
  state: SemanticPhrasePlaybackState,
  reason = 'replay_phrase',
): SemanticPhrasePlaybackState {
  return {
    ...state,
    phraseReplayCount: state.phraseReplayCount + 1,
    lastPhraseAdvanceReason: reason,
  };
}
