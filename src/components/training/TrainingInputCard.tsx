import type { KeyboardEvent, RefObject } from 'react';
import { LowLatencyTextarea, type LowLatencyTextareaHandle } from '../LowLatencyTextarea';
import { TrainingReviewPanel } from './TrainingReviewPanel';
import type { TrainingReviewModel } from '../../app/focusedTrainingReview';
import type { BrowserTtsPracticeChunkView } from '../../app/browserTtsPracticeChunks';
import type { BrowserTtsPracticeChunkTelemetry } from '../../types/dictation';
import { TrainingChunkInputPanel } from './TrainingChunkInputPanel';

export type TrainingInputCardProps = {
  textAreaId: string;
  textInputRef: RefObject<LowLatencyTextareaHandle | null>;
  currentTextValue: string;
  onTextChange: (value: string) => void;
  onImmediateTextChange: (value: string) => void;
  onTextBlur?: (value: string) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textPlaceholder: string;
  readOnly: boolean;
  textCommitDelayMs: number;
  syncKey: string;
  liveScoreLabel: string;
  liveScoreHelpText: string;
  progressLabel: string;
  livePointsLabel: string;
  livePointsHelpText: string;
  liveAccuracyLabel: string;
  liveAccuracyHelpText: string;
  liveLagLabel: string;
  liveLagHelpText: string;
  showReview: boolean;
  review: TrainingReviewModel | null;
  reviewChunks?: BrowserTtsPracticeChunkTelemetry[];
  completedPracticeChunks?: BrowserTtsPracticeChunkView[];
  activePracticeChunk?: BrowserTtsPracticeChunkView | null;
  practiceChunkActionQueued?: boolean;
  practiceChunkAdvanceCountdownSeconds?: number | null;
  finalPracticeChunkAudioCompleted?: boolean;
  onSubmitPracticeChunk?: (latestDraft: string) => void;
};

export function TrainingInputCard({
  textAreaId,
  textInputRef,
  currentTextValue,
  onTextChange,
  onImmediateTextChange,
  onTextBlur,
  onTextKeyDown,
  textPlaceholder,
  readOnly,
  textCommitDelayMs,
  syncKey,
  liveScoreLabel,
  liveScoreHelpText,
  progressLabel,
  livePointsLabel,
  livePointsHelpText,
  liveAccuracyLabel,
  liveAccuracyHelpText,
  liveLagLabel,
  liveLagHelpText,
  showReview,
  review,
  reviewChunks,
  activePracticeChunk = null,
  practiceChunkActionQueued = false,
  practiceChunkAdvanceCountdownSeconds = null,
  finalPracticeChunkAudioCompleted = false,
  onSubmitPracticeChunk,
}: TrainingInputCardProps) {
  const effectiveTextCommitDelayMs = Math.max(textCommitDelayMs, 160);
  const progressMetric = buildProgressMetric(progressLabel);

  return (
    <section className="training-card training-input-card" aria-label="Dictation input">
      <div className="training-input-header">
        <label className="training-input-heading" htmlFor={textAreaId}>Type what you hear</label>
        <div className="training-live-metrics" aria-label="Live session score, progress, points, accuracy, and lag">
          <span title={liveScoreHelpText} aria-label={`Live score ${liveScoreLabel}. ${liveScoreHelpText}`}>
            <small>Score</small>
            <strong>{liveScoreLabel}</strong>
          </span>
          {progressMetric ? (
            <span
              className="training-live-progress-metric"
              aria-label={`Live ${progressMetric.label.toLowerCase()} ${progressMetric.value}`}
            >
              <small>{progressMetric.label}</small>
              <strong>{progressMetric.value}</strong>
            </span>
          ) : null}
          <span title={livePointsHelpText} aria-label={`Live points ${livePointsLabel}. ${livePointsHelpText}`}>
            <small>Points</small>
            <strong>{livePointsLabel}</strong>
          </span>
          <span title={liveAccuracyHelpText} aria-label={`Live accuracy ${liveAccuracyLabel}. ${liveAccuracyHelpText}`}>
            <small>Accuracy</small>
            <strong>{liveAccuracyLabel}</strong>
          </span>
          <span title={liveLagHelpText} aria-label={`Live lag ${liveLagLabel}. ${liveLagHelpText}`}>
            <small>Lag</small>
            <strong>{liveLagLabel}</strong>
          </span>
        </div>
      </div>
      {showReview && review ? (
        <TrainingReviewPanel review={review} chunks={reviewChunks} />
      ) : activePracticeChunk && onSubmitPracticeChunk ? (
        <TrainingChunkInputPanel
          textAreaId={textAreaId}
          textInputRef={textInputRef}
          activeChunk={activePracticeChunk}
          currentTextValue={currentTextValue}
          onTextChange={onTextChange}
          onImmediateTextChange={onImmediateTextChange}
          onTextBlur={onTextBlur}
          onTextKeyDown={onTextKeyDown}
          onSubmitChunk={onSubmitPracticeChunk}
          textCommitDelayMs={effectiveTextCommitDelayMs}
          syncKey={syncKey}
          actionQueued={practiceChunkActionQueued}
          advanceCountdownSeconds={practiceChunkAdvanceCountdownSeconds}
          finalAudioCompleted={finalPracticeChunkAudioCompleted}
        />
      ) : (
        <LowLatencyTextarea
          id={textAreaId}
          ref={textInputRef}
          value={currentTextValue}
          onValueChange={onTextChange}
          onImmediateValueChange={onImmediateTextChange}
          onBlur={(event) => onTextBlur?.(event.currentTarget.value)}
          onKeyDown={onTextKeyDown}
          placeholder={textPlaceholder}
          readOnly={readOnly}
          rows={10}
          commitDelayMs={effectiveTextCommitDelayMs}
          maxCommitDelayMs={Math.max(effectiveTextCommitDelayMs * 2, 160)}
          syncKey={syncKey}
        />
      )}
    </section>
  );
}

function buildProgressMetric(progressLabel: string): { label: string; value: string } | null {
  const trimmed = progressLabel.trim();
  if (!trimmed || trimmed === 'No source loaded') return null;

  const namedCounter = trimmed.match(/^(Phrase|Word)\s+(.+)$/i);
  if (namedCounter) {
    return {
      label: namedCounter[1].charAt(0).toUpperCase() + namedCounter[1].slice(1).toLowerCase(),
      value: namedCounter[2].trim(),
    };
  }

  return {
    label: 'Progress',
    value: trimmed,
  };
}
