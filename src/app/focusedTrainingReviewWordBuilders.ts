import type { WordAlignmentPair } from '../core/evaluation';
import type { TrainingReviewToken, TrainingReviewWord, TrainingReviewWordState } from './focusedTrainingReview';
import type { TrainingReviewAlignmentMaps } from './focusedTrainingReviewTokenUtils';

export function buildTargetWords(
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

export function buildTypedWords(
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

export function isExtraTypedWord(word: TrainingReviewWord): boolean {
  return word.state === 'extra';
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
