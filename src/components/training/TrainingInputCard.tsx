import type { KeyboardEvent, RefObject } from 'react';
import { LowLatencyTextarea, type LowLatencyTextareaHandle } from '../LowLatencyTextarea';
import { TrainingReviewPanel } from './TrainingReviewPanel';
import type { TrainingReviewModel } from '../../app/focusedTrainingReview';

export type TrainingInputCardProps = {
  textAreaId: string;
  textInputRef: RefObject<LowLatencyTextareaHandle | null>;
  currentTextValue: string;
  onTextChange: (value: string) => void;
  onImmediateTextChange: (value: string) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textPlaceholder: string;
  readOnly: boolean;
  textCommitDelayMs: number;
  syncKey: string;
  liveScoreLabel: string;
  liveScoreHelpText: string;
  livePointsLabel: string;
  livePointsHelpText: string;
  liveAccuracyLabel: string;
  liveAccuracyHelpText: string;
  liveLagLabel: string;
  liveLagHelpText: string;
  showReview: boolean;
  review: TrainingReviewModel | null;
};

export function TrainingInputCard({
  textAreaId,
  textInputRef,
  currentTextValue,
  onTextChange,
  onImmediateTextChange,
  onTextKeyDown,
  textPlaceholder,
  readOnly,
  textCommitDelayMs,
  syncKey,
  liveScoreLabel,
  liveScoreHelpText,
  livePointsLabel,
  livePointsHelpText,
  liveAccuracyLabel,
  liveAccuracyHelpText,
  liveLagLabel,
  liveLagHelpText,
  showReview,
  review,
}: TrainingInputCardProps) {
  return (
    <section className="training-card training-input-card" aria-label="Dictation input">
      <div className="training-input-header">
        <label className="training-input-heading" htmlFor={textAreaId}>Type what you hear</label>
        <div className="training-live-metrics" aria-label="Live session score, points, accuracy, and lag">
          <span title={liveScoreHelpText} aria-label={`Live score ${liveScoreLabel}. ${liveScoreHelpText}`}>
            <small>Score</small>
            <strong>{liveScoreLabel}</strong>
          </span>
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
        <TrainingReviewPanel review={review} />
      ) : (
        <LowLatencyTextarea
          id={textAreaId}
          ref={textInputRef}
          value={currentTextValue}
          onValueChange={onTextChange}
          onImmediateValueChange={onImmediateTextChange}
          onKeyDown={onTextKeyDown}
          placeholder={textPlaceholder}
          readOnly={readOnly}
          rows={10}
          commitDelayMs={textCommitDelayMs}
          maxCommitDelayMs={Math.max(textCommitDelayMs * 3, 240)}
          syncKey={syncKey}
        />
      )}
    </section>
  );
}
