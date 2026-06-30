import type { ReactNode } from 'react';
import type { TrainingReviewModel, TrainingReviewWord } from '../../app/focusedTrainingReview';
import type { BrowserTtsPracticeChunkTelemetry } from '../../types/dictation';

export type TrainingReviewPanelProps = {
  review: TrainingReviewModel;
  chunks?: BrowserTtsPracticeChunkTelemetry[];
};

type ChunkReviewRange = {
  targetStart: number;
  targetEnd: number;
  typedStart: number;
  typedEnd: number;
};

export function TrainingReviewPanel({ review, chunks }: TrainingReviewPanelProps) {
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

      {chunks?.length ? (
        <div className="training-review-chunks" aria-label="Chunked sentence review">
          {chunks.map((chunk) => {
            const range = {
              targetStart: chunk.startWordIndex,
              targetEnd: chunk.startWordIndex + chunk.wordCount,
              typedStart: chunk.typedWordStartIndex,
              typedEnd: chunk.typedWordStartIndex + chunk.typedWordCount,
            };
            const stats = buildChunkReviewStats(review, range);

            return (
              <article className="training-review-chunk" key={chunk.id}>
                <header>
                  <strong>Chunk {chunk.index + 1}</strong>
                  <span>{formatChunkResolution(chunk)}</span>
                </header>
                <div className="training-review-chunk-summary" aria-label={`Chunk ${chunk.index + 1} score`}>
                  <span>Score {stats.matched}/{stats.total}</span>
                  <span>Accuracy {stats.accuracy.toFixed(1)}%</span>
                  <span>Matched {stats.matched}</span>
                  <span>Missing {stats.missing}</span>
                  <span>Wrong {stats.wrong}</span>
                </div>
                <p className="training-review-inline" aria-label={`Chunk ${chunk.index + 1} review with highlighted words`}>
                  {buildInlineReviewWords(review, range)}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="training-review-inline" aria-label="Sentence review with highlighted words">
          {renderedWords}
        </p>
      )}
    </div>
  );
}

function buildInlineReviewWords(
  review: TrainingReviewModel,
  range: ChunkReviewRange = {
    targetStart: 0,
    targetEnd: review.targetWords.length,
    typedStart: 0,
    typedEnd: review.typedWords.length,
  },
): ReactNode[] {
  const typedToTarget = new Map<number, number>();

  for (const pair of review.alignedPairs ?? []) {
    if (
      pair.typedIndex >= range.typedStart &&
      pair.typedIndex < range.typedEnd &&
      pair.targetIndex >= range.targetStart &&
      pair.targetIndex < range.targetEnd
    ) {
      typedToTarget.set(pair.typedIndex, pair.targetIndex);
    }
  }

  const nodes: ReactNode[] = [];
  let nextTargetIndex = range.targetStart;

  review.typedWords.slice(range.typedStart, range.typedEnd).forEach((typedWord, localTypedIndex) => {
    const typedIndex = range.typedStart + localTypedIndex;
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

  while (nextTargetIndex < range.targetEnd && nextTargetIndex < review.targetWords.length) {
    nodes.push(renderTargetWord(review.targetWords[nextTargetIndex]));
    nextTargetIndex += 1;
  }

  return nodes;
}

function buildChunkReviewStats(review: TrainingReviewModel, range: ChunkReviewRange) {
  const targetWords = review.targetWords.slice(range.targetStart, range.targetEnd);
  const typedWords = review.typedWords.slice(range.typedStart, range.typedEnd);
  const matched = targetWords.filter((word) => word.state === 'matched').length;
  const missing = targetWords.filter((word) => word.state === 'missing').length;
  const typo = targetWords.filter((word) => word.state === 'typo').length;
  const extra = typedWords.filter((word) => word.state === 'extra').length;
  const total = targetWords.length;

  return {
    total,
    matched,
    missing,
    wrong: typo + extra,
    accuracy: total > 0 ? (matched / total) * 100 : 0,
  };
}

function formatChunkResolution(chunk: BrowserTtsPracticeChunkTelemetry): string {
  if (chunk.resolution === 'timeout') return 'Continued automatically';
  if (chunk.resolution === 'skipped') return 'Skipped';
  return 'Submitted';
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
