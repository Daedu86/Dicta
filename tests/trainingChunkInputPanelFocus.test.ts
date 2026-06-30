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
      onSubmitChunk: vi.fn(),
      textCommitDelayMs: 80,
      syncKey: 'session-1:browser-tts',
      actionQueued: false,
      advanceCountdownSeconds: null,
      finalAudioCompleted: false,
      ...props,
    }));
  });
}

function mockVisualViewport({
  innerHeight,
  height,
  offsetTop = 0,
}: {
  innerHeight: number;
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
