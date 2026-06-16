import { formatSessionPointsLabel } from '../../core/evaluation';
import type { TranscriptReview } from './sessionDashboardTypes';
import { Metric, WidgetTools } from './SessionDashboardWidgetTools';

export function TranscriptReviewWidget({ review }: { review: TranscriptReview }) {
  const tooltip = 'Compares what you typed against the target Browser TTS text.';
  const typedWords = review.tokens.length;
  const totalPoints = review.tokens.reduce((sum, token) => sum + token.points, 0);
  const maxPoints = totalPoints + review.missed;
  const totalPointsLabel = formatSessionPointsLabel(totalPoints, maxPoints > 0 ? maxPoints : null);
  const exactPoints = review.tokens
    .filter((token) => token.status === 'correct')
    .reduce((sum, token) => sum + token.points, 0);
  const reviewPoints = review.tokens
    .filter((token) => token.status === 'fuzzy')
    .reduce((sum, token) => sum + token.points, 0);
  const zeroPointWords = review.tokens.filter((token) => token.points === 0).length;
  const copyText = [
    'Transcript review analytics',
    `Correct=${review.correct}`,
    `Review=${review.fuzzy}`,
    `Wrong/extra=${review.extra}`,
    `Missed=${review.missed}`,
    `Typed words=${typedWords}`,
    `Total points=${totalPointsLabel}`,
    `Exact-match points=${exactPoints}`,
    `Review points=${reviewPoints}`,
    `Zero-point words=${zeroPointWords}`,
  ].join(', ');

  return (
    <section className="dashboard-card transcript-review-card">
      <div className="transcript-review-header">
        <div className="transcript-review-title-row">
          <h3>Widget #1 - Transcript review</h3>
          <div className="transcript-review-tools">
            <WidgetTools tooltip={tooltip} copyText={copyText} />
          </div>
        </div>
        <p className="transcript-review-description">
          Green words earned points. Yellow words were accepted with a small typo. Red words did not match the transcript.
        </p>
        <div className="transcript-review-stats">
          <Metric label="Correct" value={String(review.correct)} />
          <Metric label="Review" value={String(review.fuzzy)} />
          <Metric label="Wrong / extra" value={String(review.extra)} />
          <Metric label="Missed" value={String(review.missed)} />
        </div>
        <div className="transcript-review-stats transcript-review-analytics">
          <Metric label="Typed words" value={String(typedWords)} />
          <Metric label="Total points" value={totalPointsLabel} />
          <Metric label="Exact points" value={String(exactPoints)} />
          <Metric label="Review points" value={String(reviewPoints)} />
          <Metric label="Zero-point words" value={String(zeroPointWords)} />
          <Metric label="Scored words" value={String(review.correct + review.fuzzy)} />
        </div>
      </div>

      {review.tokens.length === 0 ? (
        <div className="dashboard-empty-wrap">
          <p className="dashboard-empty">No typed transcription is saved for this session yet.</p>
        </div>
      ) : (
        <div className="word-review-flow" aria-label="Typed transcript word review">
          {review.tokens.map((token) => (
            <span key={`${token.typedIndex}-${token.word}`} className={`word-review-chip word-review-${token.status}`}>
              <small>{token.points > 0 ? `+${token.points}` : '0'}</small>
              <strong>{token.word}</strong>
              {token.expected ? <em>expected: {token.expected}</em> : null}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
