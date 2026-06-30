import { useEffect, type KeyboardEvent, type RefObject } from 'react';
import type { BrowserTtsPracticeChunkView } from '../../app/browserTtsPracticeChunks';
import { LowLatencyTextarea, type LowLatencyTextareaHandle } from '../LowLatencyTextarea';

export type TrainingChunkInputPanelProps = {
  textAreaId: string;
  textInputRef: RefObject<LowLatencyTextareaHandle | null>;
  completedChunks: BrowserTtsPracticeChunkView[];
  activeChunk: BrowserTtsPracticeChunkView;
  currentTextValue: string;
  onTextChange: (value: string) => void;
  onImmediateTextChange: (value: string) => void;
  onTextBlur?: (value: string) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmitChunk: (latestDraft: string) => void;
  textCommitDelayMs: number;
  syncKey: string;
  actionQueued: boolean;
  advanceCountdownSeconds?: number | null;
  finalAudioCompleted: boolean;
};

export function TrainingChunkInputPanel({
  textAreaId,
  textInputRef,
  completedChunks,
  activeChunk,
  currentTextValue,
  onTextChange,
  onImmediateTextChange,
  onTextBlur,
  onTextKeyDown,
  onSubmitChunk,
  textCommitDelayMs,
  syncKey,
  actionQueued,
  advanceCountdownSeconds = null,
  finalAudioCompleted,
}: TrainingChunkInputPanelProps) {
  const countdownLabel = advanceCountdownSeconds !== null ? ` (${Math.max(0, advanceCountdownSeconds)} Secs)` : '';
  const actionLabel = activeChunk.isFinal
    ? 'Finish session'
    : currentTextValue.trim()
      ? 'Submit / Check'
      : 'Skip chunk';
  const queuedActionLabel = advanceCountdownSeconds !== null
    ? `Submit / Check${countdownLabel}`
    : 'Waiting for audio…';

  const submitLatest = () => onSubmitChunk(textInputRef.current?.flush() ?? currentTextValue);

  useEffect(() => {
    if (actionQueued) return;
    textInputRef.current?.focus();
  }, [activeChunk.id, actionQueued, textInputRef]);

  return (
    <div className="training-chunk-flow" aria-label="Chunk-by-chunk dictation input">
      {completedChunks.length > 0 ? (
        <div className="training-chunk-history" aria-label="Completed chunks">
          {completedChunks.map((chunk) => (
            <article className="training-chunk-card training-chunk-card-complete" key={chunk.id}>
              <header>
                <strong>Chunk {chunk.index + 1}</strong>
                <span>{formatResolution(chunk.resolution)}</span>
              </header>
              <p>{chunk.typedText || 'No answer'}</p>
            </article>
          ))}
        </div>
      ) : null}

      <article className="training-chunk-card training-chunk-card-active">
        <header>
          <label htmlFor={textAreaId}>Chunk {activeChunk.index + 1}</label>
          <span>{activeChunk.isFinal ? 'Final chunk' : 'Listening chunk'}</span>
        </header>
        <LowLatencyTextarea
          id={textAreaId}
          ref={textInputRef}
          value={currentTextValue}
          onValueChange={onTextChange}
          onImmediateValueChange={onImmediateTextChange}
          onBlur={(event) => onTextBlur?.(event.currentTarget.value)}
          onKeyDown={(event) => {
            onTextKeyDown(event);
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              submitLatest();
            }
          }}
          placeholder="Type only this spoken chunk..."
          readOnly={actionQueued}
          rows={5}
          commitDelayMs={textCommitDelayMs}
          maxCommitDelayMs={Math.max(textCommitDelayMs * 2, 160)}
          syncKey={`${syncKey}:practice:${activeChunk.id}`}
        />
        <div className="training-chunk-action-row">
          <p>
            {actionQueued
              ? advanceCountdownSeconds !== null
                ? 'Submitted. The next chunk starts when the counter reaches zero.'
                : 'Submitted. Playback will continue after this phrase finishes.'
              : activeChunk.isFinal && finalAudioCompleted
                ? 'Audio complete. Finish when your final answer is ready.'
                : 'Ctrl/Cmd + Enter also submits this chunk.'}
          </p>
          <button type="button" onClick={submitLatest} disabled={actionQueued}>
            {actionQueued ? queuedActionLabel : actionLabel}
          </button>
        </div>
      </article>
    </div>
  );
}

function formatResolution(resolution: BrowserTtsPracticeChunkView['resolution']): string {
  if (resolution === 'timeout') return 'Continued automatically';
  if (resolution === 'skipped') return 'Skipped';
  return 'Submitted';
}
