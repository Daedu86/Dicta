import type { PhraseBoundaryType } from '../../core/adaptive/types';
import { buildBrowserTtsV3ProsodyMetadata } from './ttsChunkProsodyMetadata';
import {
  boundaryFromToken,
  boundaryScore,
  isUnsafePair,
  minimumBoundaryScore,
  normalizeWord,
  scoreChunk,
  targetWordsForSize,
} from './ttsDynamicChunkPlannerScoring';
import type {
  BrowserTtsV3PauseClass,
  PlanBrowserTtsChunkInput,
  PlannedBrowserTtsChunk,
} from './ttsDynamicChunkPlannerTypes';

export type {
  BoundaryStrictness,
  BrowserTtsV3BreathGroup,
  BrowserTtsV3PauseClass,
  BrowserTtsV3ProsodyMetadata,
  BrowserTtsV3ReplayStrategy,
  BrowserTtsV3SemanticCompletenessClass,
  BrowserTtsV3SyntacticRisk,
  PlanBrowserTtsChunkInput,
  PlannedBrowserTtsChunk,
  SupportedLanguage,
} from './ttsDynamicChunkPlannerTypes';

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
  const startWordIndex = input.globalStartWordIndex + input.macroWordOffset;
  const tailWord = normalizeWord(words[words.length - 1] ?? '');
  const nextWord = normalizeWord(input.macroWords[endIndex] ?? '');
  const edgeWordFlag = bestBoundary === 'unsafe' || isUnsafePair(tailWord, nextWord, input.language);

  return {
    text: words.join(' '),
    startWordIndex,
    wordCount: words.length,
    phraseBoundaryType: bestBoundary,
    canPauseAfter,
    canReplayIndependently: false,
    semanticCompleteness: scored.semanticCompleteness,
    punctuationLoad: scored.punctuationLoad,
    rareWordLoad: scored.rareWordLoad,
    syntaxComplexity: scored.syntaxComplexity,
    phraseDifficulty: scored.phraseDifficulty,
    v3Prosody: buildBrowserTtsV3ProsodyMetadata({
      boundaryType: bestBoundary,
      edgeWordFlag,
      pauseClass: classifyBrowserTtsV3PauseClass(bestBoundary, recoverySafeBoundary),
      phraseDifficulty: scored.phraseDifficulty,
      semanticCompleteness: scored.semanticCompleteness,
      startWordIndex,
      syntaxComplexity: scored.syntaxComplexity,
      wordCount: words.length,
    }),
  };
}

function classifyBrowserTtsV3PauseClass(
  boundaryType: PhraseBoundaryType,
  recoverySafeBoundary: boolean,
): BrowserTtsV3PauseClass {
  if (recoverySafeBoundary && (boundaryType === 'sentence' || boundaryType === 'clause')) return 'recovery';
  if (boundaryType === 'sentence') return 'sentence';
  if (boundaryType === 'clause') return 'boundary';
  if (boundaryType === 'minor') return 'micro';
  return 'none';
}
