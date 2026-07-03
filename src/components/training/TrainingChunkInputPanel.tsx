import {
  useCallback,
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
  canPlay: boolean;
  playLabel: string;
  onPlay?: () => void;
  onReplayChunk?: (startWordIndex: number) => void;
  onSubmitChunk: (latestDraft: string) => void;
  textCommitDelayMs: number;
  syncKey: string;
  actionQueued: boolean;
  advanceCountdownSeconds?: number | null;
  audioCompleted: boolean;
  playFocusRequestId?: number;
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
  canPlay,
  playLabel,
  onPlay,
  onReplayChunk,
  onSubmitChunk,
  textCommitDelayMs,
  syncKey,
  actionQueued,
  advanceCountdownSeconds = null,
  audioCompleted,
  playFocusRequestId = 0,
}: TrainingChunkInputPanelProps) {
  const keyboardDockReleaseTimerRef = useRef<number | null>(null);
  const keyboardScrollTimerRef = useRef<number | null>(null);
  const keyboardDockActivationSerialRef = useRef(0);
  const activeChunkIdRef = useRef(activeChunk.id);
  const handledPlayFocusRequestIdRef = useRef(playFocusRequestId);
  const actionRowRef = useRef<HTMLDivElement | null>(null);
  const [keyboardDockActive, setKeyboardDockActive] = useState(false);
  const keyboardLayout = useVisualViewportKeyboardLayout(keyboardDockActive);
  const countdownLabel = advanceCountdownSeconds !== null ? ` (${Math.max(0, advanceCountdownSeconds)} Secs)` : '';
  const actionLabel = activeChunk.isFinal
    ? 'Finish session'
    : currentTextValue.trim()
      ? 'Submit / Check'
      : 'Skip chunk';
  const queuedActionLabel = advanceCountdownSeconds !== null
    ? `Submit / Check${countdownLabel}`
    : 'Preparing next chunk…';

  const submitLatest = () => onSubmitChunk(textInputRef.current?.flush() ?? currentTextValue);

  const handleChunkKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onTextKeyDown(event);

    const isEnterSubmission = event.key === 'Enter' && !event.nativeEvent.isComposing && (
      event.ctrlKey ||
      event.metaKey ||
      (!event.shiftKey && !event.altKey)
    );
    if (!isEnterSubmission) return;

    event.preventDefault();
    if (audioCompleted && !actionQueued && !event.repeat) submitLatest();
  };

  const clearKeyboardDockReleaseTimer = useCallback(() => {
    if (keyboardDockReleaseTimerRef.current === null) return;
    window.clearTimeout(keyboardDockReleaseTimerRef.current);
    keyboardDockReleaseTimerRef.current = null;
  }, []);

  const clearKeyboardScrollTimer = useCallback(() => {
    if (keyboardScrollTimerRef.current === null) return;
    window.clearTimeout(keyboardScrollTimerRef.current);
    keyboardScrollTimerRef.current = null;
  }, []);

  const scrollChunkActionIntoView = useCallback(() => {
    clearKeyboardScrollTimer();
    keyboardScrollTimerRef.current = window.setTimeout(() => {
      keyboardScrollTimerRef.current = null;
      actionRowRef.current?.scrollIntoView({ block: 'end', inline: 'nearest' });
    }, 80);
  }, [clearKeyboardScrollTimer]);

  const activateKeyboardDock = useCallback(() => {
    keyboardDockActivationSerialRef.current += 1;
    clearKeyboardDockReleaseTimer();
    setKeyboardDockActive(true);
    scrollChunkActionIntoView();
  }, [clearKeyboardDockReleaseTimer, scrollChunkActionIntoView]);

  const focusChunkTextareaAndRevealAction = useCallback(() => {
    activateKeyboardDock();
    textInputRef.current?.focus({ scroll: false });
  }, [activateKeyboardDock, textInputRef]);

  const releaseKeyboardDockSoon = useCallback(() => {
    clearKeyboardDockReleaseTimer();
    const releaseSerial = keyboardDockActivationSerialRef.current;
    const releaseChunkId = activeChunkIdRef.current;
    keyboardDockReleaseTimerRef.current = window.setTimeout(() => {
      if (
        keyboardDockActivationSerialRef.current !== releaseSerial ||
        activeChunkIdRef.current !== releaseChunkId ||
        getVisualViewportKeyboardLayout().keyboardInsetPx > 0
      ) {
        keyboardDockReleaseTimerRef.current = null;
        return;
      }
      setKeyboardDockActive(false);
      keyboardDockReleaseTimerRef.current = null;
    }, 400);
  }, [clearKeyboardDockReleaseTimer]);

  useEffect(() => {
    activeChunkIdRef.current = activeChunk.id;
  }, [activeChunk.id]);

  useEffect(() => {
    if (actionQueued) return;
    focusChunkTextareaAndRevealAction();
  }, [activeChunk.id, actionQueued, focusChunkTextareaAndRevealAction]);

  useEffect(() => {
    if (
      !playFocusRequestId ||
      actionQueued ||
      handledPlayFocusRequestIdRef.current === playFocusRequestId
    ) {
      return;
    }
    handledPlayFocusRequestIdRef.current = playFocusRequestId;
    focusChunkTextareaAndRevealAction();
  }, [actionQueued, focusChunkTextareaAndRevealAction, playFocusRequestId]);

  useEffect(() => () => {
    clearKeyboardDockReleaseTimer();
    clearKeyboardScrollTimer();
  }, [clearKeyboardDockReleaseTimer, clearKeyboardScrollTimer]);

  const flowClassName = keyboardDockActive
    ? 'training-chunk-flow training-chunk-flow-keyboard-active'
    : 'training-chunk-flow';
  const flowStyle = {
    '--training-visual-keyboard-inset': `${keyboardLayout.keyboardInsetPx}px`,
    '--training-visual-viewport-height': `${keyboardLayout.visualViewportHeightPx}px`,
  } as CSSProperties;

  return (
    <div className={flowClassName} style={flowStyle} aria-label="Chunk-by-chunk dictation input">
      <article className="training-chunk-card training-chunk-card-active">
        <header>
          <label htmlFor={textAreaId}>Chunk {activeChunk.index + 1}</label>
          <span>{activeChunk.isFinal ? 'Final chunk' : 'Listening chunk'}</span>
        </header>
        <LowLatencyTextarea
          key={activeChunk.id}
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
          onKeyDown={handleChunkKeyDown}
          placeholder="Type only this spoken chunk..."
          readOnly={actionQueued}
          enterKeyHint={activeChunk.isFinal ? 'done' : 'next'}
          rows={5}
          commitDelayMs={textCommitDelayMs}
          maxCommitDelayMs={Math.max(textCommitDelayMs * 2, 160)}
          syncKey={`${syncKey}:practice:${activeChunk.id}`}
        />
        <div ref={actionRowRef} className="training-chunk-action-row">
          <p aria-live="polite">
            {actionQueued
              ? advanceCountdownSeconds !== null
                ? 'Submitted. The next chunk starts when the counter reaches zero.'
                : 'Submitted. Preparing the next chunk.'
              : !audioCompleted
                ? 'Listening… Keep typing. Submit unlocks when this chunk finishes.'
                : activeChunk.isFinal
                  ? 'Audio complete. Finish when your final answer is ready.'
                  : 'Audio complete. Enter submits this chunk. Shift + Enter adds a new line.'}
          </p>
          <div className="training-chunk-action-buttons">
            <button
              type="button"
              onPointerDown={activateKeyboardDock}
              onClick={onPlay}
              disabled={actionQueued || !canPlay || !onPlay}
            >
              {playLabel}
            </button>
            <button
              type="button"
              className="secondary-button"
              onPointerDown={(event) => {
                event.preventDefault();
                activateKeyboardDock();
              }}
              onClick={() => onReplayChunk?.(activeChunk.startWordIndex)}
              disabled={actionQueued || !onReplayChunk}
            >
              Replay chunk
            </button>
            <button
              type="button"
              onPointerDown={activateKeyboardDock}
              onClick={submitLatest}
              disabled={actionQueued || !audioCompleted}
            >
              {actionQueued ? queuedActionLabel : audioCompleted ? actionLabel : 'Listening…'}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

type VisualViewportKeyboardLayout = {
  keyboardInsetPx: number;
  visualViewportHeightPx: number;
};

function useVisualViewportKeyboardLayout(active: boolean): VisualViewportKeyboardLayout {
  const [keyboardLayout, setKeyboardLayout] = useState<VisualViewportKeyboardLayout>(() => getVisualViewportKeyboardLayout());

  useEffect(() => {
    if (!active) {
      setKeyboardLayout({
        ...getVisualViewportKeyboardLayout(),
        keyboardInsetPx: 0,
      });
      return;
    }

    const measure = () => {
      const nextLayout = getVisualViewportKeyboardLayout();
      setKeyboardLayout((currentLayout) => (
        currentLayout.keyboardInsetPx === nextLayout.keyboardInsetPx &&
        currentLayout.visualViewportHeightPx === nextLayout.visualViewportHeightPx
          ? currentLayout
          : nextLayout
      ));
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

  return keyboardLayout;
}

function getVisualViewportKeyboardLayout(): VisualViewportKeyboardLayout {
  if (typeof window === 'undefined') {
    return {
      keyboardInsetPx: 0,
      visualViewportHeightPx: 0,
    };
  }

  const visualViewport = window.visualViewport;
  const fallbackViewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  if (!visualViewport) {
    return {
      keyboardInsetPx: 0,
      visualViewportHeightPx: Math.round(fallbackViewportHeight),
    };
  }

  const layoutViewportHeight = Math.max(
    fallbackViewportHeight,
    document.documentElement.clientHeight || 0,
    visualViewport.height,
  );
  const visibleViewportBottom = visualViewport.offsetTop + visualViewport.height;
  const keyboardInset = Math.max(0, layoutViewportHeight - visibleViewportBottom);

  return {
    keyboardInsetPx: Math.round(keyboardInset),
    visualViewportHeightPx: Math.round(visualViewport.height),
  };
}
