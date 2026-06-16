import type { ListeningPrecisionMetrics } from '../core/adaptive/types';
import { computeListeningPrecisionMetrics } from '../core/adaptive/listeningPrecisionMetrics';
import type { AttemptEvaluation } from '../core/evaluation';
import type {
  PlannedBrowserTtsChunk,
  SupportedLanguage,
} from '../inputs/browserTts/ttsDynamicChunkPlanner';
import { clamp01 } from './appRuntimeHelpers';

export type BrowserTtsChunkCorrectionPressure = {
  backspaceRate: number;
  correctionRate: number;
};

export function computeBrowserTtsChunkListeningPrecision({
  livePracticeEvaluation,
  language,
  chunk,
}: {
  livePracticeEvaluation: AttemptEvaluation;
  language: SupportedLanguage;
  chunk: PlannedBrowserTtsChunk;
}): ListeningPrecisionMetrics {
  const typedText = extractTypedTextForChunk(livePracticeEvaluation, chunk);

  return computeListeningPrecisionMetrics({
    targetText: chunk.text,
    typedText,
    typedTextAtPlaybackEnd: typedText,
    language,
  });
}

export function computeBrowserTtsChunkCorrectionPressure(
  evaluation: AttemptEvaluation,
  chunk: PlannedBrowserTtsChunk,
): BrowserTtsChunkCorrectionPressure {
  const typedWords = extractTypedWordsForChunk(evaluation, chunk);
  const chunkStart = chunk.startWordIndex;
  const chunkEnd = chunkStart + chunk.wordCount;
  const matchedPairs = evaluation.alignedPairs.filter(
    (pair) => pair.targetIndex >= chunkStart && pair.targetIndex < chunkEnd,
  );
  const matchedCount = matchedPairs.length;
  const fuzzyMatchCount = matchedPairs.filter((pair) => !pair.exact).length;
  const missedCount = Math.max(0, chunk.wordCount - matchedCount);
  const extraCount = Math.max(0, typedWords.length - matchedCount);
  const denominator = Math.max(1, chunk.wordCount);

  return {
    // Browser TTS does not yet receive key-level deletion events in this planning path.
    backspaceRate: 0,
    correctionRate: clamp01((missedCount + extraCount + fuzzyMatchCount) / denominator),
  };
}

function extractTypedTextForChunk(
  evaluation: AttemptEvaluation,
  chunk: PlannedBrowserTtsChunk,
): string {
  return extractTypedWordsForChunk(evaluation, chunk).join(' ');
}

function extractTypedWordsForChunk(
  evaluation: AttemptEvaluation,
  chunk: PlannedBrowserTtsChunk,
): string[] {
  const chunkStart = chunk.startWordIndex;
  const chunkEnd = chunkStart + chunk.wordCount;
  const matchedTypedIndices = evaluation.alignedPairs
    .filter((pair) => pair.targetIndex >= chunkStart && pair.targetIndex < chunkEnd)
    .map((pair) => pair.typedIndex)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < evaluation.typedWords.length);

  if (matchedTypedIndices.length === 0) {
    const fallbackStart = Math.max(0, Math.min(evaluation.typedWords.length, chunkStart));
    const fallbackEnd = Math.max(
      fallbackStart,
      Math.min(evaluation.typedWords.length, fallbackStart + chunk.wordCount),
    );
    return evaluation.typedWords.slice(fallbackStart, fallbackEnd);
  }

  const typedStart = Math.max(0, Math.min(...matchedTypedIndices));
  const typedEnd = Math.min(evaluation.typedWords.length, Math.max(...matchedTypedIndices) + 1);
  return evaluation.typedWords.slice(typedStart, typedEnd);
}
