// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LowLatencyTextarea } from '../src/components/LowLatencyTextarea';
import { perfDiagnostics } from '../src/core/perfDiagnostics';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function textArea(): HTMLTextAreaElement {
  const element = host.querySelector('textarea');
  if (!element) throw new Error('textarea not rendered');
  return element;
}

function input(value: string): void {
  const element = textArea();
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  valueSetter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  vi.useFakeTimers();
  perfDiagnostics.configure({ envDev: false, search: '?perf=1', storage: window.localStorage });
  perfDiagnostics.reset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

describe('LowLatencyTextarea performance gate', () => {
  it('keeps rapid visible typing local and batches parent commits', () => {
    const commits: string[] = [];
    const immediateValues: string[] = [];
    const renderCounts: number[] = [];

    function render(value = ''): void {
      renderCounts.push(renderCounts.length + 1);
      root.render(createElement(LowLatencyTextarea, {
        value,
        onValueChange: (nextValue: string) => commits.push(nextValue),
        onImmediateValueChange: (nextValue: string) => immediateValues.push(nextValue),
        commitDelayMs: 90,
        maxCommitDelayMs: 250,
        syncKey: 'typing-session',
      }));
    }

    act(() => {
      render();
    });

    const finalText = 'dies ist ein langer test fuer die low latency eingabe ohne parent commit pro taste';

    act(() => {
      for (let index = 1; index <= finalText.length; index += 1) {
        input(finalText.slice(0, index));
      }
    });

    expect(textArea().value).toBe(finalText);
    expect(commits).toEqual([]);
    expect(immediateValues).toHaveLength(finalText.length);
    expect(renderCounts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(89);
    });

    expect(commits).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(commits).toEqual([finalText]);

    const snapshot = perfDiagnostics.snapshot();
    expect(snapshot.input.latest?.valueLength).toBe(finalText.length);
    expect(snapshot.input.latest?.renderCount).toBe(1);
  });
});
