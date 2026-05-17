import type { PhraseBoundaryType, PhraseSize } from '../../core/adaptive/types';

export type BoundaryStrictness = 'sentence' | 'clause' | 'phrase';
export type SupportedLanguage = 'en' | 'es' | 'de';

export type PlanBrowserTtsChunkInput = {
  macroWords: string[];
  macroWordOffset: number;
  globalStartWordIndex: number;
  language: SupportedLanguage;
  nextPhraseSize: PhraseSize;
  boundaryStrictness: BoundaryStrictness;
  germanShortBias?: boolean;
  maxWordsOverride?: number;
  recoverySafeBoundary?: boolean;
};

export type PlannedBrowserTtsChunk = {
  text: string;
  startWordIndex: number;
  wordCount: number;
  phraseBoundaryType: PhraseBoundaryType;
  canPauseAfter: boolean;
  canReplayIndependently: boolean;
  semanticCompleteness: number;
  punctuationLoad: number;
  rareWordLoad: number;
  syntaxComplexity: number;
  phraseDifficulty: number;
};

const SENTENCE_END_RE = /[.!?]["')\]]*$/;
const CLAUSE_END_RE = /[,;:]["')\]]*$|--$|[–—]$/;

const DISCOURSE_MARKERS: Record<SupportedLanguage, string[]> = {
  en: ['and', 'but', 'because', 'however', 'therefore', 'then', 'so', 'while'],
  es: ['y', 'pero', 'porque', 'sin', 'embargo', 'entonces', 'asi', 'ademas', 'aunque'],
  de: ['und', 'aber', 'weil', 'doch', 'dann', 'deshalb', 'wahrend', 'obwohl'],
};

const UNSAFE_WORDS: Record<SupportedLanguage, string[]> = {
  en: ['a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being'],
  es: ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para', 'es', 'son', 'ser', 'estar', 'se'],
  de: ['der', 'die', 'das', 'ein', 'eine', 'zu', 'mit', 'von', 'im', 'am', 'ist', 'sind', 'war', 'sein', 'haben'],
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

function normalizeWord(raw: string): string {
  return raw.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function boundaryFromToken(token: string): PhraseBoundaryType {
  if (SENTENCE_END_RE.test(token)) return 'sentence';
  if (CLAUSE_END_RE.test(token)) return 'clause';
  return 'minor';
}

function boundaryScore(boundary: PhraseBoundaryType): number {
  if (boundary === 'sentence') return 3;
  if (boundary === 'clause') return 2;
  if (boundary === 'minor') return 1;
  return 0;
}

function minimumBoundaryScore(strictness: BoundaryStrictness): number {
  if (strictness === 'sentence') return 3;
  if (strictness === 'clause') return 2;
  return 1;
}

function targetWordsForSize(size: PhraseSize, germanShortBias: boolean): number {
  const base = size === 'short' ? 6 : size === 'long' ? 18 : 11;
  return germanShortBias ? Math.max(4, base - 2) : base;
}

function isUnsafePair(leftWord: string, rightWord: string, language: SupportedLanguage): boolean {
  if (!leftWord || !rightWord) return false;
  const unsafe = UNSAFE_WORDS[language];
  if (unsafe.includes(leftWord)) return true;
  if (language === 'de' && /^(ge)?.+en$/.test(rightWord) && /^(hat|haben|hast|habe|wird|werden|wurde|wurden)$/.test(leftWord)) {
    return true;
  }
  if (language === 'es' && /^(me|te|se|lo|la|le|nos|os|los|las|les)$/.test(leftWord)) {
    return true;
  }
  return false;
}

function scoreChunk(words: string[], language: SupportedLanguage, boundaryType: PhraseBoundaryType) {
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

export function planBrowserTtsAdaptiveChunk(input: PlanBrowserTtsChunkInput): PlannedBrowserTtsChunk | null {
  const remaining = input.macroWords.length - input.macroWordOffset;
  if (remaining <= 0) return null;

  const germanShortBias = Boolean(input.germanShortBias && input.language === 'de');
  const recoverySafeBoundary = Boolean(input.recoverySafeBoundary && input.language === 'de');
  const targetWords = targetWordsForSize(input.nextPhraseSize, germanShortBias);
  const cappedTargetWords = input.maxWordsOverride ? Math.min(targetWords, input.maxWordsOverride) : targetWords;
  const sizeTarget = Math.min(cappedTargetWords, remaining);
  const minWords = Math.max(2, Math.min(remaining, Math.floor(sizeTarget * 0.65)));
  const uncappedMaxWords = Math.max(minWords, Math.min(remaining, Math.floor(sizeTarget * 1.35)));
  const maxWords = input.maxWordsOverride ? Math.min(uncappedMaxWords, input.maxWordsOverride) : uncappedMaxWords;
  const scanLimit = Math.min(remaining, input.maxWordsOverride && !recoverySafeBoundary ? maxWords : maxWords + 6);
  const minBoundary = recoverySafeBoundary
    ? Math.max(minimumBoundaryScore(input.boundaryStrictness), boundaryScore('clause'))
    : minimumBoundaryScore(input.boundaryStrictness);

  let bestCut = Math.min(remaining, maxWords);
  let bestBoundary: PhraseBoundaryType = 'unsafe';
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let wordsToTake = minWords; wordsToTake <= scanLimit; wordsToTake += 1) {
    const cutIndex = input.macroWordOffset + wordsToTake - 1;
    const lastToken = input.macroWords[cutIndex] ?? '';
    const boundaryType = boundaryFromToken(lastToken);
    const boundaryValue = boundaryScore(boundaryType);
    if (boundaryValue < minBoundary) continue;

    const chunkWords = input.macroWords.slice(input.macroWordOffset, cutIndex + 1);
    const left = normalizeWord(lastToken);
    const right = normalizeWord(input.macroWords[cutIndex + 1] ?? '');
    const unsafeEdge = wordsToTake < remaining && isUnsafePair(left, right, input.language);
    const effectiveBoundary: PhraseBoundaryType = unsafeEdge ? 'unsafe' : boundaryType;

    const sizePenalty = Math.abs(wordsToTake - sizeTarget) / Math.max(1, sizeTarget);
    const scored = scoreChunk(chunkWords, input.language, effectiveBoundary);
    const score =
      scored.semanticCompleteness * 1.3 +
      boundaryScore(effectiveBoundary) * 0.25 -
      scored.phraseDifficulty * 0.45 -
      sizePenalty * 0.35;

    if (recoverySafeBoundary && effectiveBoundary !== 'unsafe' && boundaryScore(effectiveBoundary) >= boundaryScore('clause')) {
      // During DE recovery, prefer the nearest safe boundary over a shorter unsafe cut.
      bestScore = score;
      bestCut = wordsToTake;
      bestBoundary = effectiveBoundary;
      break;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCut = wordsToTake;
      bestBoundary = effectiveBoundary;
    }

    if (boundaryType === 'sentence' && !unsafeEdge) {
      // Stop early on a clean sentence boundary.
      break;
    }
  }

  const endIndex = input.macroWordOffset + bestCut;
  const words = input.macroWords.slice(input.macroWordOffset, endIndex);
  const scored = scoreChunk(words, input.language, bestBoundary);
  const canPauseAfter = bestBoundary === 'sentence' || bestBoundary === 'clause';

  return {
    text: words.join(' '),
    startWordIndex: input.globalStartWordIndex + input.macroWordOffset,
    wordCount: words.length,
    phraseBoundaryType: bestBoundary,
    canPauseAfter,
    canReplayIndependently: false,
    semanticCompleteness: scored.semanticCompleteness,
    punctuationLoad: scored.punctuationLoad,
    rareWordLoad: scored.rareWordLoad,
    syntaxComplexity: scored.syntaxComplexity,
    phraseDifficulty: scored.phraseDifficulty,
  };
}
