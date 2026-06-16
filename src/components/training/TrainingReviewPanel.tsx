import type { TrainingReviewModel, TrainingReviewWord } from '../../app/focusedTrainingReview';

export type TrainingReviewPanelProps = {
  review: TrainingReviewModel;
};

export function TrainingReviewPanel({ review }: TrainingReviewPanelProps) {
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
        {review.targetWords.map((word) => renderTargetWord(word))}
        {review.typedWords.filter((word) => word.state === 'extra').length > 0 ? (
          <span className="training-review-extras" aria-label="Extra typed words">
            {review.typedWords.filter((word) => word.state === 'extra').map((word) => (
              <span
                key={word.id}
                className="training-review-word training-review-word-extra"
                aria-label={`Extra word ${word.displayText}`}
              >
                {word.displayText}
              </span>
            ))}
          </span>
        ) : null}
      </p>
    </div>
  );
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

function countTypos(words: TrainingReviewWord[]): number {
  return words.filter((word) => word.state === 'typo').length;
}
