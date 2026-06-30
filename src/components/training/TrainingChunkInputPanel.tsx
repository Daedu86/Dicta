import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { BrowserTtsPracticeChunkView } from '../../app/browserTtsPracticeChunks';
import { LowLatencyTextarea, type LowLatencyTextareaHandle } from '../LowLatencyTextarea';

export type TrainingChunkInputPanelProps = {
  textAreaId: string;
  textInputRef: RefObject<LowLatencyTextareaHandle | null>;
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
  const keyboardDockReleaseTimerRef = useRef<number | null>(null);
  const [keyboardDockActive, setKeyboardDockActive] = useState(false);
  const keyboardInsetPx = useVisualViewportKeyboardInset(keyboardDockActive);
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

  const clearKeyboardDockReleaseTimer = () => {
    if (keyboardDockReleaseTimerRef.current === null) return;
    window.clearTimeout(keyboardDockReleaseTimerRef.current);
    keyboardDockReleaseTimerRef.current = null;
  };

  const activateKeyboardDock = () => {
    clearKeyboardDockReleaseTimer();
    setKeyboardDockActive(true);
  };

  const releaseKeyboardDockSoon = () => {
    clearKeyboardDockReleaseTimer();
    keyboardDockReleaseTimerRef.current = window.setTimeout(() => {
      setKeyboardDockActive(false);
      keyboardDockReleaseTimerRef.current = null;
    }, 400);
  };

  useEffect(() => {
    if (actionQueued) return;
    textInputRef.current?.focus();
  }, [activeChunk.id, actionQueued, textInputRef]);

  useEffect(() => () => {
    if (keyboardDockReleaseTimerRef.current === null) return;
    window.clearTimeout(keyboardDockReleaseTimerRef.current);
  }, []);

  const flowClassName = keyboardDockActive
    ? 'training-chunk-flow training-chunk-flow-keyboard-active'
    : 'training-chunk-flow';
  const flowStyle = {
    '--training-visual-keyboard-inset': `${keyboardInsetPx}px`,
  } as CSSProperties;

  return (
    <div className={flowClassName} style={flowStyle} aria-label="Chunk-by-chunk dictation input">
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
          onFocus={activateKeyboardDock}
          onBlur={(event) => {
            releaseKeyboardDockSoon();
            onTextBlur?.(event.currentTarget.value);
          }}
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
          <button type="button" onPointerDown={activateKeyboardDock} onClick={submitLatest} disabled={actionQueued}>
            {actionQueued ? queuedActionLabel : actionLabel}
          </button>
        </div>
      </article>
    </div>
  );
}

function useVisualViewportKeyboardInset(active: boolean): number {
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0);

  useEffect(() => {
    if (!active) {
      setKeyboardInsetPx(0);
      return;
    }

    const measure = () => {
      setKeyboardInsetPx(getVisualViewportKeyboardInset());
    };
    const visualViewport = window.visualViewport;

    measure();
    visualViewport?.addEventListener('resize', measure);
    visualViewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);

    return () => {
      visualViewport?.removeEventListener('resize', measure);
      visualViewport?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [active]);

  return keyboardInsetPx;
}

function getVisualViewportKeyboardInset(): number {
  const visualViewport = window.visualViewport;
  if (!visualViewport) return 0;

  const layoutViewportHeight = window.innerHeight || document.documentElement.clientHeight || visualViewport.height;
  const visibleViewportBottom = visualViewport.offsetTop + visualViewport.height;
  const keyboardInset = Math.max(0, layoutViewportHeight - visibleViewportBottom);

  return Math.round(keyboardInset);
}
