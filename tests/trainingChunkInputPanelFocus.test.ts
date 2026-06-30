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

beforeEach(() => {
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
});
