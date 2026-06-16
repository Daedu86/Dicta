import { evaluateTranscriptAttempt, type WordAlignmentPair } from '../core/evaluation';
import { normalizeWord } from '../core/normalization';

export type TrainingReviewWordState = 'matched' | 'missing' | 'extra';

export type TrainingReviewWord = {
  id: string;
  text: string;
  state: TrainingReviewWordState;
  exact: boolean;
};

export type TrainingReviewModel = {
  targetWords: TrainingReviewWord[];
  typedWords: TrainingReviewWord[];
  matchedCount: number;
  missedCount: number;
  extraCount: number;
  accuracy: number;
};

export function buildFocusedTrainingReview(targetText: string, typedText: string): TrainingReviewModel {
  const evaluation = evaluateTranscriptAttempt(typedText, buildTranscriptLikeTarget(targetText));
  const targetWords = buildTargetWords(evaluation.alignedPairs, evaluation.targetWords);
  const typedWords = buildTypedWords(evaluation.alignedPairs, evaluation.typedWords);

  return {
    targetWords,
    typedWords,
    matchedCount: evaluation.matchedWords,
    missedCount: evaluation.missedWords,
    extraCount: evaluation.extraWords,
    accuracy: evaluation.accuracy,
  };
}

function buildTranscriptLikeTarget(text: string): { words: Array<{ word: string; start: number; end: number }> } | null {
  const words = text
    .split(/\s+/)
    .map((word, index) => {
      const normalized = normalizeWord(word);
      return normalized ? { word: normalized, start: index, end: index + 1 } : null;
    })
    .filter((word): word is { word: string; start: number; end: number } => Boolean(word));

  return words.length > 0 ? { words } : null;
}

function buildTargetWords(alignedPairs: WordAlignmentPair[], targetWords: string[]): TrainingReviewWord[] {
  const matchedByTargetIndex = new Map<number, WordAlignmentPair>();
  for (const pair of alignedPairs) {
    matchedByTargetIndex.set(pair.targetIndex, pair);
  }

  return targetWords.map((text, index) => {
    const pair = matchedByTargetIndex.get(index);
    return {
      id: `target-${index}`,
      text,
      state: pair ? 'matched' : 'missing',
      exact: pair?.exact ?? false,
    };
  });
}

function buildTypedWords(alignedPairs: WordAlignmentPair[], typedWords: string[]): TrainingReviewWord[] {
  const matchedByTypedIndex = new Map<number, WordAlignmentPair>();
  for (const pair of alignedPairs) {
    matchedByTypedIndex.set(pair.typedIndex, pair);
  }

  return typedWords.map((text, index) => {
    const pair = matchedByTypedIndex.get(index);
    return {
      id: `typed-${index}`,
      text,
      state: pair ? 'matched' : 'extra',
      exact: pair?.exact ?? false,
    };
  });
}
