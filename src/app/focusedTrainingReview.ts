import { evaluateTranscriptAttempt, type WordAlignmentPair } from '../core/evaluation';
import { normalizeWord } from '../core/normalization';

export type TrainingReviewWordState = 'matched' | 'missing' | 'extra' | 'typo';

export type TrainingReviewWord = {
  id: string;
  text: string;
  displayText: string;
  state: TrainingReviewWordState;
  exact: boolean;
  hintText?: string;
};

export type TrainingReviewModel = {
  targetWords: TrainingReviewWord[];
  typedWords: TrainingReviewWord[];
  extraTypedWords: TrainingReviewWord[];
  alignedPairs?: { typedIndex: number; targetIndex: number; exact: boolean }[];
  matchedCount: number;
  missedCount: number;
  extraCount: number;
  accuracy: number;
};

export function buildFocusedTrainingReview(targetText: string, typedText: string): TrainingReviewModel {
  const targetTokens = buildTokenizedWords(targetText);
  const typedTokens = buildTokenizedWords(typedText);
  const evaluation = evaluateTranscriptAttempt(
    typedText,
    targetTokens.length > 0 ? { words: targetTokens.map((token, index) => ({ word: token.normalized, start: index, end: index + 1 })) } : null,
  );
  const targetWords = buildTargetWords(evaluation.alignedPairs, targetTokens, typedTokens);
  const typedWords = buildTypedWords(evaluation.alignedPairs, typedTokens, targetTokens);
  const extraTypedWords = typedWords.filter((word) => word.state === 'extra');

  return {
    targetWords,
    typedWords,
    extraTypedWords,
    alignedPairs: evaluation.alignedPairs,
    matchedCount: evaluation.matchedWords,
    missedCount: evaluation.missedWords,
    extraCount: evaluation.extraWords,
    accuracy: evaluation.accuracy,
  };
}

type TrainingReviewToken = {
  text: string;
  normalized: string;
};

function buildTokenizedWords(text: string): TrainingReviewToken[] {
  return text
    .split(/\s+/)
    .map((word) => {
      const normalized = normalizeWord(word);
      return normalized ? { text: word, normalized } : null;
    })
    .filter((word): word is TrainingReviewToken => Boolean(word));
}

function buildTargetWords(
  alignedPairs: WordAlignmentPair[],
  targetWords: TrainingReviewToken[],
  typedWords: TrainingReviewToken[],
): TrainingReviewWord[] {
  const matchedByTargetIndex = new Map<number, WordAlignmentPair>();
  for (const pair of alignedPairs) {
    matchedByTargetIndex.set(pair.targetIndex, pair);
  }

  return targetWords.map((token, index) => {
    const pair = matchedByTargetIndex.get(index);
    const typedToken = pair ? typedWords[pair.typedIndex] : undefined;
    return {
      id: `target-${index}`,
      text: token.normalized,
      displayText: pair && !pair.exact && typedToken ? typedToken.text : token.text,
      state: pair ? (pair.exact ? 'matched' : 'typo') : 'missing',
      exact: pair?.exact ?? false,
      hintText: pair && !pair.exact ? token.text : undefined,
    };
  });
}

function buildTypedWords(
  alignedPairs: WordAlignmentPair[],
  typedWords: TrainingReviewToken[],
  targetWords: TrainingReviewToken[],
): TrainingReviewWord[] {
  const matchedByTypedIndex = new Map<number, WordAlignmentPair>();
  for (const pair of alignedPairs) {
    matchedByTypedIndex.set(pair.typedIndex, pair);
  }

  return typedWords.map((token, index) => {
    const pair = matchedByTypedIndex.get(index);
    const nearestTarget = pair ? targetWords[pair.targetIndex] : findNearestTargetToken(token, targetWords);
    return {
      id: `typed-${index}`,
      text: token.normalized,
      displayText: token.text,
      state: pair ? (pair.exact ? 'matched' : 'typo') : nearestTarget ? 'typo' : 'extra',
      exact: pair?.exact ?? false,
      hintText: pair && !pair.exact ? targetWords[pair.targetIndex]?.text ?? undefined : nearestTarget?.text ?? undefined,
    };
  });
}

function findNearestTargetToken(
  typedToken: TrainingReviewToken,
  targetWords: TrainingReviewToken[],
): TrainingReviewToken | undefined {
  let bestTarget: TrainingReviewToken | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const target of targetWords) {
    const distance = wordDistance(typedToken.normalized, target.normalized);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTarget = target;
    }
  }

  return bestDistance <= 1 ? bestTarget : undefined;
}

function wordDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (Math.abs(a.length - b.length) > 1) {
    return 2;
  }

  let edits = 0;
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return edits;
    }

    if (a.length > b.length) {
      i += 1;
    } else if (b.length > a.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < a.length || j < b.length) {
    edits += 1;
  }

  return edits;
}
