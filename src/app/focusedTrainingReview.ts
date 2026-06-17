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

type TrainingReviewToken = {
  text: string;
  normalized: string;
};

type TrainingReviewAlignmentMaps = {
  matchedByTargetIndex: Map<number, WordAlignmentPair>;
  matchedByTypedIndex: Map<number, WordAlignmentPair>;
};

export function buildFocusedTrainingReview(targetText: string, typedText: string): TrainingReviewModel {
  const targetTokens = buildTokenizedWords(targetText);
  const typedTokens = buildTokenizedWords(typedText);
  const evaluation = evaluateTranscriptAttempt(typedText, buildEvaluationTranscript(targetTokens));
  const alignmentMaps = buildTrainingReviewAlignmentMaps(evaluation.alignedPairs);
  const targetWords = buildTargetWords(alignmentMaps, targetTokens, typedTokens);
  const typedWords = buildTypedWords(alignmentMaps, typedTokens, targetTokens);

  return {
    targetWords,
    typedWords,
    extraTypedWords: typedWords.filter(isExtraTypedWord),
    alignedPairs: evaluation.alignedPairs,
    matchedCount: evaluation.matchedWords,
    missedCount: evaluation.missedWords,
    extraCount: evaluation.extraWords,
    accuracy: evaluation.accuracy,
  };
}

function buildEvaluationTranscript(targetTokens: TrainingReviewToken[]): { words: Array<{ word: string; start: number; end: number }> } | null {
  if (targetTokens.length === 0) return null;
  return {
    words: targetTokens.map((token, index) => ({
      word: token.normalized,
      start: index,
      end: index + 1,
    })),
  };
}

function buildTokenizedWords(text: string): TrainingReviewToken[] {
  return text
    .split(/\s+/)
    .map(buildTrainingReviewToken)
    .filter((word): word is TrainingReviewToken => Boolean(word));
}

function buildTrainingReviewToken(word: string): TrainingReviewToken | null {
  const normalized = normalizeWord(word);
  return normalized ? { text: word, normalized } : null;
}

function buildTrainingReviewAlignmentMaps(alignedPairs: WordAlignmentPair[]): TrainingReviewAlignmentMaps {
  const matchedByTargetIndex = new Map<number, WordAlignmentPair>();
  const matchedByTypedIndex = new Map<number, WordAlignmentPair>();

  for (const pair of alignedPairs) {
    matchedByTargetIndex.set(pair.targetIndex, pair);
    matchedByTypedIndex.set(pair.typedIndex, pair);
  }

  return { matchedByTargetIndex, matchedByTypedIndex };
}

function buildTargetWords(
  alignmentMaps: TrainingReviewAlignmentMaps,
  targetWords: TrainingReviewToken[],
  typedWords: TrainingReviewToken[],
): TrainingReviewWord[] {
  return targetWords.map((token, index) =>
    buildTargetReviewWord({
      token,
      index,
      pair: alignmentMaps.matchedByTargetIndex.get(index),
      typedWords,
    }),
  );
}

function buildTargetReviewWord({
  token,
  index,
  pair,
  typedWords,
}: {
  token: TrainingReviewToken;
  index: number;
  pair: WordAlignmentPair | undefined;
  typedWords: TrainingReviewToken[];
}): TrainingReviewWord {
  const typedToken = pair ? typedWords[pair.typedIndex] : undefined;
  const isTypo = Boolean(pair && !pair.exact);

  return {
    id: `target-${index}`,
    text: token.normalized,
    displayText: isTypo && typedToken ? typedToken.text : token.text,
    state: pair ? (pair.exact ? 'matched' : 'typo') : 'missing',
    exact: pair?.exact ?? false,
    hintText: isTypo ? token.text : undefined,
  };
}

function buildTypedWords(
  alignmentMaps: TrainingReviewAlignmentMaps,
  typedWords: TrainingReviewToken[],
  targetWords: TrainingReviewToken[],
): TrainingReviewWord[] {
  return typedWords.map((token, index) =>
    buildTypedReviewWord({
      token,
      index,
      pair: alignmentMaps.matchedByTypedIndex.get(index),
      targetWords,
    }),
  );
}

function buildTypedReviewWord({
  token,
  index,
  pair,
  targetWords,
}: {
  token: TrainingReviewToken;
  index: number;
  pair: WordAlignmentPair | undefined;
  targetWords: TrainingReviewToken[];
}): TrainingReviewWord {
  const nearestTarget = pair ? targetWords[pair.targetIndex] : findNearestTargetToken(token, targetWords);
  return {
    id: `typed-${index}`,
    text: token.normalized,
    displayText: token.text,
    state: resolveTypedWordState(pair, nearestTarget),
    exact: pair?.exact ?? false,
    hintText: resolveTypedWordHintText(pair, targetWords, nearestTarget),
  };
}

function resolveTypedWordState(
  pair: WordAlignmentPair | undefined,
  nearestTarget: TrainingReviewToken | undefined,
): TrainingReviewWordState {
  if (pair) return pair.exact ? 'matched' : 'typo';
  return nearestTarget ? 'typo' : 'extra';
}

function resolveTypedWordHintText(
  pair: WordAlignmentPair | undefined,
  targetWords: TrainingReviewToken[],
  nearestTarget: TrainingReviewToken | undefined,
): string | undefined {
  if (pair && !pair.exact) return targetWords[pair.targetIndex]?.text ?? undefined;
  return nearestTarget?.text;
}

function isExtraTypedWord(word: TrainingReviewWord): boolean {
  return word.state === 'extra';
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
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;

  return countSingleEditDistance(a, b);
}

function countSingleEditDistance(a: string, b: string): number {
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
    if (edits > 1) return edits;

    if (a.length > b.length) {
      i += 1;
    } else if (b.length > a.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  return i < a.length || j < b.length ? edits + 1 : edits;
}
