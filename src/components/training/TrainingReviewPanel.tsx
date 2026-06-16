import type { ReactNode } from 'react';
import type { TrainingReviewModel, TrainingReviewWord } from '../../app/focusedTrainingReview';

export type TrainingReviewPanelProps = {
  review: TrainingReviewModel;
};

export function TrainingReviewPanel({ review }: TrainingReviewPanelProps) {
  const renderedWords = buildInlineReviewWords(review);

  return (
    <div className="training-review-panel" aria-label="Submitted answer review">
      <div className="training-review-legend" aria-label="Review legend">
        <span className="training-review-legend-item training-review-legend-matched">Matched</span>
        <span className="training-review-legend-item training-review-legend-missing">Missing</span>
        <span className="training-review-legend-item training-review-legend-typo">Wrong typed</span>
        <span className="training-review-legend-item training-review-legend-extra">Extra</span>
      </div>

      <div className="training-review-summary" aria-label="Review summary">
        <span>Accuracy {review.accuracy.toFixed(1)}%</span>
        <span>Matched {review.matchedCount}</span>
        <span>Missing {review.missedCount}</span>
        <span>Wrong {review.extraCount + countTypos(review.targetWords)}</span>
      </div>

      <p className="training-review-inline" aria-label="Sentence review with highlighted words">
        {renderedWords}
      </p>
    </div>
  );
}

function buildInlineReviewWords(review: TrainingReviewModel): ReactNode[] {
  const typedToTarget = new Map<number, number>();

  for (const pair of review.alignedPairs ?? []) {
    typedToTarget.set(pair.typedIndex, pair.targetIndex);
  }

  const nodes: ReactNode[] = [];
  let nextTargetIndex = 0;

  review.typedWords.forEach((typedWord, typedIndex) => {
    const targetIndex = typedToTarget.get(typedIndex);

    if (typedWord.state === 'extra') {
      nodes.push(renderExtraWord(typedWord));
      return;
    }

    if (targetIndex === undefined) {
      return;
    }

    while (nextTargetIndex < targetIndex) {
      if (review.targetWords[nextTargetIndex].state === 'missing') {
        nodes.push(renderTargetWord(review.targetWords[nextTargetIndex]));
      }
      nextTargetIndex += 1;
    }

    nodes.push(renderTargetWord(review.targetWords[targetIndex]));
    nextTargetIndex = targetIndex + 1;
  });

  while (nextTargetIndex < review.targetWords.length) {
    nodes.push(renderTargetWord(review.targetWords[nextTargetIndex]));
    nextTargetIndex += 1;
  }

  return nodes;
}

function renderTargetWord(word: TrainingReviewWord) {
  if (word.state === 'matched') {
    return (
      <span key={word.id} className="training-review-word training-review-word-matched" aria-label={`Matched word ${word.displayText}`}>
        {word.displayText}
      </span>
    );
  }

  if (word.state === 'typo') {
    return (
      <span key={word.id} className="training-review-word training-review-word-typo" aria-label={`Wrong typed word ${word.displayText}`}>
        <span className="training-review-word-main">{word.displayText}</span>
        <small className="training-review-word-hint">{word.hintText ?? 'correct word'}</small>
      </span>
    );
  }

  return (
    <span key={word.id} className="training-review-word training-review-word-missing" aria-label={`Missing word ${word.displayText}`}>
      <del className="training-review-word-delete">{word.displayText}</del>
    </span>
  );
}

function renderExtraWord(word: TrainingReviewWord) {
  return (
    <span key={word.id} className="training-review-word training-review-word-extra" aria-label={`Extra word ${word.displayText}`}>
      {word.displayText}
    </span>
  );
}

function countTypos(words: TrainingReviewWord[]): number {
  return words.filter((word) => word.state === 'typo').length;
}
