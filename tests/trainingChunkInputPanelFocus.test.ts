// @vitest-environment jsdom
import { act, createElement, createRef, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserTtsPracticeChunkView } from '../src/app/browserTtsPracticeChunks';
import type { LowLatencyTextareaHandle } from '../src/components/LowLatencyTextarea';
import { TrainingChunkInputPanel } from '../src/components/training/TrainingChunkInputPanel';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
type VisualViewportEventType = 'resize' | 'scroll';

function practiceChunk(overrides: Partial<BrowserTtsPracticeChunkView>): BrowserTtsPracticeChunkView {
  const index = overrides.index ?? 0;
  const startWordIndex = overrides.startWordIndex ?? 0;

  return {
    id: `practice-${index}-${startWordIndex}`,
    index,
    startWordIndex,
    wordCount: 3,
    firstSemanticPhraseIndex: index,
    lastSemanticPhraseIndex: index,
    isFinal: false,
    typedText: '',
    ...overrides,
  };
}

function renderPanel(props: Partial<ComponentProps<typeof TrainingChunkInputPanel>> = {}): void {
  act(() => {
    root.render(createElement(TrainingChunkInputPanel, {
      textAreaId: 'training-dictation-input',
      textInputRef: createRef<LowLatencyTextareaHandle>(),
      activeChunk: practiceChunk({ id: 'practice-0-0', index: 0, startWordIndex: 0 }),
      currentTextValue: '',
      onTextChange: vi.fn(),
      onImmediateTextChange: vi.fn(),
      onTextBlur: vi.fn(),
      onTextKeyDown: vi.fn(),
      canPlay: true,
      playLabel: 'Play',
      onPlay: vi.fn(),
      onReplayChunk: vi.fn(),
      onSubmitChunk: vi.fn(),
      textCommitDelayMs: 80,
      syncKey: 'session-1:browser-tts',
      actionQueued: false,
      advanceCountdownSeconds: null,
      finalAudioCompleted: false,
      playFocusRequestId: 0,
      ...props,
    }));
  });
}

function mockVisualViewport({
  innerHeight,
  clientHeight = 0,
  height,
  offsetTop = 0,
}: {
  innerHeight: number;
  clientHeight?: number;
  height: number;
  offsetTop?: number;
}) {
  const listeners = new Map<VisualViewportEventType, Set<() => void>>();
  const viewport = {
    height,
    offsetTop,
    addEventListener: vi.fn((type: VisualViewportEventType, listener: () => void) => {
      const typeListeners = listeners.get(type) ?? new Set<() => void>();
      typeListeners.add(listener);
      listeners.set(type, typeListeners);
    }),
    removeEventListener: vi.fn((type: VisualViewportEventType, listener: () => void) => {
      listeners.get(type)?.delete(listener);
    }),
  };

  Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });

  return {
    emit(type: VisualViewportEventType) {
      listeners.get(type)?.forEach((listener) => listener());
    },
    setHeight(nextHeight: number) {
      viewport.height = nextHeight;
    },
  };
}

beforeEach(() => {
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 0 });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe('TrainingChunkInputPanel focus handoff', () => {
  it('runs the embedded play action from the chunk controls', () => {
    const onPlay = vi.fn();
    renderPanel({ onPlay });

    act(() => {
      host.querySelector<HTMLButtonElement>('.training-chunk-action-buttons button')?.click();
    });

    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('replays the active chunk from its exact source-word boundary', () => {
    const onReplayChunk = vi.fn();
    renderPanel({
      activeChunk: practiceChunk({ id: 'practice-2-12', index: 2, startWordIndex: 12 }),
      onReplayChunk,
    });

    act(() => {
      host.querySelector<HTMLButtonElement>('.training-chunk-action-buttons .secondary-button')?.click();
    });

    expect(onReplayChunk).toHaveBeenCalledOnce();
    expect(onReplayChunk).toHaveBeenCalledWith(12);
  });

  it('submits the latest visible chunk draft when Enter is pressed', () => {
    const onSubmitChunk = vi.fn();
    renderPanel({ onSubmitChunk });
    const textarea = host.querySelector<HTMLTextAreaElement>('#training-dictation-input');

    act(() => {
      if (!textarea) return;
      textarea.value = 'latest uncommitted answer';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      textarea?.dispatchEvent(enterEvent);
    });

    expect(enterEvent.defaultPrevented).toBe(true);
    expect(onSubmitChunk).toHaveBeenCalledOnce();
    expect(onSubmitChunk).toHaveBeenCalledWith('latest uncommitted answer');
  });

  it('keeps Shift + Enter available for a new line', () => {
    const onSubmitChunk = vi.fn();
    renderPanel({ onSubmitChunk });
    const shiftEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    act(() => {
      host.querySelector<HTMLTextAreaElement>('#training-dictation-input')?.dispatchEvent(shiftEnterEvent);
    });

    expect(shiftEnterEvent.defaultPrevented).toBe(false);
    expect(onSubmitChunk).not.toHaveBeenCalled();
  });

  it('does not resubmit with Enter while the chunk action is queued', () => {
    const onSubmitChunk = vi.fn();
    renderPanel({ actionQueued: true, onSubmitChunk });
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    act(() => {
      host.querySelector<HTMLTextAreaElement>('#training-dictation-input')?.dispatchEvent(enterEvent);
    });

    expect(enterEvent.defaultPrevented).toBe(true);
    expect(onSubmitChunk).not.toHaveBeenCalled();
  });

  it('starts the next chunk with an empty focused textarea at the first cursor position after Enter', () => {
    const textInputRef = createRef<LowLatencyTextareaHandle>();
    const onSubmitChunk = vi.fn();
    renderPanel({
      textInputRef,
      activeChunk: practiceChunk({ id: 'practice-0-0', index: 0, startWordIndex: 0 }),
      currentTextValue: 'first chunk answer',
      onSubmitChunk,
    });

    const firstTextarea = host.querySelector<HTMLTextAreaElement>('#training-dictation-input');
    act(() => {
      firstTextarea?.focus();
      firstTextarea?.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }));
    });

    expect(onSubmitChunk).toHaveBeenCalledWith('first chunk answer');

    renderPanel({
      textInputRef,
      activeChunk: practiceChunk({ id: 'practice-1-3', index: 1, startWordIndex: 3 }),
      currentTextValue: '',
      onSubmitChunk,
    });

    const nextTextarea = host.querySelector<HTMLTextAreaElement>('#training-dictation-input');
    expect(nextTextarea).not.toBe(firstTextarea);
    expect(nextTextarea?.value).toBe('');
    expect(document.activeElement).toBe(nextTextarea);
    expect(nextTextarea?.selectionStart).toBe(0);
    expect(nextTextarea?.selectionEnd).toBe(0);
  });

  it('starts the next chunk empty and focused after the visible submit button is used', () => {
    const textInputRef = createRef<LowLatencyTextareaHandle>();
    const onSubmitChunk = vi.fn();
    renderPanel({
      textInputRef,
      activeChunk: practiceChunk({ id: 'practice-0-0', index: 0, startWordIndex: 0 }),
      currentTextValue: 'button submitted answer',
      onSubmitChunk,
    });

    act(() => {
      host.querySelector<HTMLButtonElement>('.training-chunk-action-buttons button:last-child')?.click();
    });
    expect(onSubmitChunk).toHaveBeenCalledWith('button submitted answer');

    renderPanel({
      textInputRef,
      activeChunk: practiceChunk({ id: 'practice-1-3', index: 1, startWordIndex: 3 }),
      currentTextValue: '',
      onSubmitChunk,
    });

    const nextTextarea = host.querySelector<HTMLTextAreaElement>('#training-dictation-input');
    expect(nextTextarea?.value).toBe('');
    expect(document.activeElement).toBe(nextTextarea);
    expect(nextTextarea?.selectionStart).toBe(0);
    expect(nextTextarea?.selectionEnd).toBe(0);
  });

  it('keeps textarea focus and the existing caret position when replay is pressed', () => {
    const onReplayChunk = vi.fn();
    renderPanel({
      currentTextValue: 'partially typed answer',
      onReplayChunk,
    });

    const textarea = host.querySelector<HTMLTextAreaElement>('#training-dictation-input');
    const replayButton = host.querySelector<HTMLButtonElement>('.training-chunk-action-buttons .secondary-button');

    act(() => {
      textarea?.focus();
      textarea?.setSelectionRange(9, 9);
    });

    const pointerDownEvent = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    act(() => {
      replayButton?.dispatchEvent(pointerDownEvent);
      replayButton?.click();
    });

    expect(pointerDownEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(textarea);
    expect(textarea?.selectionStart).toBe(9);
    expect(textarea?.selectionEnd).toBe(9);
    expect(onReplayChunk).toHaveBeenCalledOnce();
  });

  it('focuses the active chunk textarea when a submitted chunk advances', () => {
    const textInputRef = createRef<LowLatencyTextareaHandle>();
    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);

    renderPanel({
      textInputRef,
      activeChunk: practiceChunk({ id: 'practice-0-0', index: 0, startWordIndex: 0 }),
      actionQueued: true,
      advanceCountdownSeconds: 1,
    });

    outsideButton.focus();
    expect(document.activeElement).toBe(outsideButton);

    renderPanel({
      textInputRef,
      activeChunk: practiceChunk({ id: 'practice-1-3', index: 1, startWordIndex: 3 }),
      actionQueued: false,
      advanceCountdownSeconds: null,
    });

    expect(document.activeElement).toBe(host.querySelector('#training-dictation-input'));
    outsideButton.remove();
  });

  it('publishes the visual keyboard inset while the chunk textarea is focused', () => {
    const visualViewport = mockVisualViewport({ innerHeight: 800, height: 520 });

    renderPanel();

    act(() => {
      host.querySelector<HTMLTextAreaElement>('#training-dictation-input')?.focus();
    });
    act(() => {
      visualViewport.emit('resize');
    });

    const flow = host.querySelector<HTMLElement>('.training-chunk-flow');
    expect(flow?.classList.contains('training-chunk-flow-keyboard-active')).toBe(true);
    expect(flow?.style.getPropertyValue('--training-visual-keyboard-inset')).toBe('280px');
    expect(flow?.style.getPropertyValue('--training-visual-viewport-height')).toBe('520px');
  });

  it('keeps the keyboard inset when Chrome reports innerHeight as the visible viewport', () => {
    const visualViewport = mockVisualViewport({ innerHeight: 520, clientHeight: 800, height: 520 });

    renderPanel();

    act(() => {
      host.querySelector<HTMLTextAreaElement>('#training-dictation-input')?.focus();
    });
    act(() => {
      visualViewport.emit('resize');
    });

    const flow = host.querySelector<HTMLElement>('.training-chunk-flow');
    expect(flow?.classList.contains('training-chunk-flow-keyboard-active')).toBe(true);
    expect(flow?.style.getPropertyValue('--training-visual-keyboard-inset')).toBe('280px');
    expect(flow?.style.getPropertyValue('--training-visual-viewport-height')).toBe('520px');
  });

  it('scrolls the chunk action row into view after focus without docking the card', () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

    try {
      renderPanel();

      act(() => {
        host.querySelector<HTMLTextAreaElement>('#training-dictation-input')?.focus();
      });
      act(() => {
        vi.advanceTimersByTime(90);
      });

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'end', inline: 'nearest' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not keep re-scrolling the chunk action row during viewport resize events', () => {
    vi.useFakeTimers();
    const visualViewport = mockVisualViewport({ innerHeight: 800, height: 520 });
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

    try {
      renderPanel();

      act(() => {
        host.querySelector<HTMLTextAreaElement>('#training-dictation-input')?.focus();
      });
      act(() => {
        vi.advanceTimersByTime(90);
      });

      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      act(() => {
        visualViewport.setHeight(500);
        visualViewport.emit('resize');
        visualViewport.setHeight(540);
        visualViewport.emit('scroll');
        vi.advanceTimersByTime(120);
      });

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles a play focus request by focusing the textarea and revealing submit once', () => {
    vi.useFakeTimers();
    const textInputRef = createRef<LowLatencyTextareaHandle>();
    const scrollIntoView = vi.fn();
    const outsideButton = document.createElement('button');
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    document.body.appendChild(outsideButton);

    try {
      renderPanel({
        textInputRef,
        currentTextValue: 'ready text',
        playFocusRequestId: 0,
      });
      act(() => {
        vi.advanceTimersByTime(90);
      });
      scrollIntoView.mockClear();

      outsideButton.focus();
      expect(document.activeElement).toBe(outsideButton);

      renderPanel({
        textInputRef,
        currentTextValue: 'ready text',
        playFocusRequestId: 1,
      });

      expect(document.activeElement).toBe(host.querySelector('#training-dictation-input'));
      const textarea = host.querySelector<HTMLTextAreaElement>('#training-dictation-input');
      expect(textarea?.selectionStart).toBe('ready text'.length);
      expect(textarea?.selectionEnd).toBe('ready text'.length);

      act(() => {
        vi.advanceTimersByTime(90);
      });

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'end', inline: 'nearest' });
    } finally {
      outsideButton.remove();
      vi.useRealTimers();
    }
  });

  it('ignores a stale blur release after the next chunk activates', () => {
    vi.useFakeTimers();
    const textInputRef = createRef<LowLatencyTextareaHandle>();
    const nativeFocus = window.HTMLElement.prototype.focus;

    try {
      renderPanel({
        textInputRef,
        activeChunk: practiceChunk({ id: 'practice-0-0', index: 0, startWordIndex: 0 }),
      });

      const textarea = host.querySelector<HTMLTextAreaElement>('#training-dictation-input');
      act(() => {
        textarea?.focus();
      });
      act(() => {
        textarea?.blur();
      });

      window.HTMLElement.prototype.focus = vi.fn();
      renderPanel({
        textInputRef,
        activeChunk: practiceChunk({ id: 'practice-1-3', index: 1, startWordIndex: 3 }),
      });
      act(() => {
        vi.advanceTimersByTime(450);
      });

      const flow = host.querySelector<HTMLElement>('.training-chunk-flow');
      expect(flow?.classList.contains('training-chunk-flow-keyboard-active')).toBe(true);
    } finally {
      window.HTMLElement.prototype.focus = nativeFocus;
      vi.useRealTimers();
    }
  });
});
