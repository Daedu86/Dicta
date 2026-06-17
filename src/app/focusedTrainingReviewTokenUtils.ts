import type { WordAlignmentPair } from '../core/evaluation';
import { normalizeWord } from '../core/normalization';
import type { TrainingReviewToken } from './focusedTrainingReview';

export type TrainingReviewAlignmentMaps = {
  matchedByTargetIndex: Map<number, WordAlignmentPair>;
  matchedByTypedIndex: Map<number, WordAlignmentPair>;
};

export function buildEvaluationTranscript(
  targetTokens: TrainingReviewToken[],
): { words: Array<{ word: string; start: number; end: number }> } | null {
  if (targetTokens.length === 0) return null;
  return {
    words: targetTokens.map((token, index) => ({
      word: token.normalized,
      start: index,
      end: index + 1,
    })),
  };
}

export function buildTokenizedWords(text: string): TrainingReviewToken[] {
  return text
    .split(/\s+/)
    .map(buildTrainingReviewToken)
    .filter((word): word is TrainingReviewToken => Boolean(word));
}

export function buildTrainingReviewAlignmentMaps(alignedPairs: WordAlignmentPair[]): TrainingReviewAlignmentMaps {
  const matchedByTargetIndex = new Map<number, WordAlignmentPair>();
  const matchedByTypedIndex = new Map<number, WordAlignmentPair>();

  for (const pair of alignedPairs) {
    matchedByTargetIndex.set(pair.targetIndex, pair);
    matchedByTypedIndex.set(pair.typedIndex, pair);
  }

  return { matchedByTargetIndex, matchedByTypedIndex };
}

function buildTrainingReviewToken(word: string): TrainingReviewToken | null {
  const normalized = normalizeWord(word);
  return normalized ? { text: word, normalized } : null;
}
