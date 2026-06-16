import type { TrainingReviewModel } from '../../app/focusedTrainingReview';

export type TrainingReviewPanelProps = {
  review: TrainingReviewModel;
};

export function TrainingReviewPanel({ review }: TrainingReviewPanelProps) {
  return (
    <div className="training-review-panel" aria-label="Submitted answer review">
      <div className="training-review-legend" aria-label="Review legend">
        <span className="training-review-legend-item training-review-legend-matched">Matched</span>
        <span className="training-review-legend-item training-review-legend-missing">Missing</span>
        <span className="training-review-legend-item training-review-legend-extra">Extra</span>
      </div>

      <div className="training-review-summary" aria-label="Review summary">
        <span>Accuracy {review.accuracy.toFixed(1)}%</span>
        <span>Matched {review.matchedCount}</span>
        <span>Missing {review.missedCount}</span>
        <span>Extra {review.extraCount}</span>
      </div>

      <div className="training-review-columns">
        <section className="training-review-column" aria-label="Target text review">
          <p className="training-review-column-label">Original text</p>
          <p className="training-review-line" aria-label="Original text with matches and misses">
            {review.targetWords.map((word) => (
              <span
                key={word.id}
                className={`training-review-word training-review-word-${word.state}`}
                aria-label={
                  word.state === 'matched'
                    ? `Matched word ${word.text}`
                    : `Missing word ${word.text}`
                }
              >
                {word.text}
              </span>
            ))}
          </p>
        </section>

        <section className="training-review-column" aria-label="Your answer review">
          <p className="training-review-column-label">Your answer</p>
          <p className="training-review-line" aria-label="Typed text with matches and extras">
            {review.typedWords.length > 0 ? (
              review.typedWords.map((word) => (
                <span
                  key={word.id}
                  className={`training-review-word training-review-word-${word.state}`}
                  aria-label={
                    word.state === 'matched'
                      ? `Matched word ${word.text}`
                      : `Extra word ${word.text}`
                  }
                >
                  {word.text}
                </span>
              ))
            ) : (
              <span className="training-review-empty">No typed words.</span>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
