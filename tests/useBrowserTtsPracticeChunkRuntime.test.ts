// @vitest-environment jsdom
import { act, createElement, createRef, forwardRef, useImperativeHandle, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserTtsPracticeChunkDefinition } from '../src/app/browserTtsPracticeChunks';
import { useBrowserTtsPracticeChunkRuntime } from '../src/app/useBrowserTtsPracticeChunkRuntime';
import type { SessionTelemetry } from '../src/types/dictation';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type PracticeChunkRuntime = ReturnType<typeof useBrowserTtsPracticeChunkRuntime>;

let host: HTMLDivElement;
let root: Root;
let runtimeRef: RefObject<PracticeChunkRuntime | null>;
let setTtsPracticeText: ReturnType<typeof vi.fn>;
const telemetryRef: { current: SessionTelemetry } = { current: {} };
const ttsPracticeLiveTextRef = { current: '' };

const Harness = forwardRef<PracticeChunkRuntime>(function Harness(_props, ref) {
  const runtime = useBrowserTtsPracticeChunkRuntime({
    activeSession: null,
    activeSessionFinished: false,
    ttsPracticeText: '',
    setTtsPracticeText,
    telemetryRef,
    ttsPracticeLiveTextRef,
  });
  useImperativeHandle(ref, () => runtime, [runtime]);
  return null;
});

function getRuntime(): PracticeChunkRuntime {
  if (!runtimeRef.current) throw new Error('Practice chunk runtime is not mounted.');
  return runtimeRef.current;
}

function practiceChunk(overrides: Partial<BrowserTtsPracticeChunkDefinition> = {}): BrowserTtsPracticeChunkDefinition {
  return {
    id: 'practice-0-0',
    index: 0,
    startWordIndex: 0,
    wordCount: 4,
    firstSemanticPhraseIndex: 0,
    lastSemanticPhraseIndex: 1,
    isFinal: false,
    ...overrides,
  };
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  runtimeRef = createRef<PracticeChunkRuntime>();
  setTtsPracticeText = vi.fn();
  telemetryRef.current = {};
  ttsPracticeLiveTextRef.current = '';
  act(() => root.render(createElement(Harness, { ref: runtimeRef })));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('useBrowserTtsPracticeChunkRuntime', () => {
  it('ignores early submission and only queues advancement after the visible chunk audio completes', () => {
    const chunk = practiceChunk();
    act(() => getRuntime().onPracticeChunkPlan([chunk], 0));

    act(() => getRuntime().requestCurrentChunkAdvance('partial answer'));

    expect(getRuntime().practiceChunkAdvanceRequestRef.current).toBeNull();
    expect(getRuntime().actionQueued).toBe(false);
    expect(setTtsPracticeText).not.toHaveBeenCalled();

    act(() => getRuntime().onPracticeChunkAudioCompleted(chunk));
    expect(getRuntime().activeChunkAudioCompleted).toBe(true);

    act(() => getRuntime().requestCurrentChunkAdvance('complete answer'));

    expect(getRuntime().practiceChunkAdvanceRequestRef.current).toBe(0);
    expect(getRuntime().actionQueued).toBe(true);
    expect(setTtsPracticeText).toHaveBeenLastCalledWith('complete answer');
  });

  it('resets audio completion when replay rebuilds the same chunk plan', () => {
    const chunk = practiceChunk();
    act(() => getRuntime().onPracticeChunkPlan([chunk], 0));
    act(() => getRuntime().onPracticeChunkAudioCompleted(chunk));

    expect(getRuntime().activeChunkAudioCompleted).toBe(true);

    act(() => getRuntime().onPracticeChunkPlan([chunk], chunk.startWordIndex));

    expect(getRuntime().activeChunkAudioCompleted).toBe(false);
    expect(getRuntime().practiceChunkAdvanceRequestRef.current).toBeNull();
  });

  it('finishes the final chunk only after its complete audio has played', () => {
    const chunk = practiceChunk({ isFinal: true, lastSemanticPhraseIndex: 0 });
    const finishSession = vi.fn();
    act(() => getRuntime().onPracticeChunkPlan([chunk], 0));
    getRuntime().finishSessionRef.current = finishSession;

    act(() => getRuntime().requestCurrentChunkAdvance('too early'));
    expect(finishSession).not.toHaveBeenCalled();

    act(() => getRuntime().onPracticeChunkAudioCompleted(chunk));
    act(() => getRuntime().requestCurrentChunkAdvance('final answer'));

    expect(finishSession).toHaveBeenCalledWith('final answer');
  });
});
