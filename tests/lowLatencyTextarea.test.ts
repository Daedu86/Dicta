// @vitest-environment jsdom
import { act, createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LowLatencyTextarea, type LowLatencyTextareaHandle } from '../src/components/LowLatencyTextarea';

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

describe('LowLatencyTextarea', () => {
  it('updates the visible textarea immediately while delaying the parent commit', () => {
    const commits: string[] = [];
    act(() => {
      root.render(createElement(LowLatencyTextarea, {
        value: '',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
      }));
    });

    act(() => {
      input('hola');
    });

    expect(textArea().value).toBe('hola');
    expect(commits).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(90);
    });

    expect(commits).toEqual(['hola']);
  });

  it('flushes the latest visible value through the imperative handle', () => {
    const commits: string[] = [];
    const ref = createRef<LowLatencyTextareaHandle>();
    act(() => {
      root.render(createElement(LowLatencyTextarea, {
        ref,
        value: '',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
      }));
    });

    act(() => {
      input('texto final');
    });

    let flushed = '';
    act(() => {
      flushed = ref.current?.flush() ?? '';
    });

    expect(flushed).toBe('texto final');
    expect(commits).toEqual(['texto final']);
  });

  it('flushes on blur so navigation or submit-adjacent focus changes do not lose text', () => {
    const commits: string[] = [];
    act(() => {
      root.render(createElement(LowLatencyTextarea, {
        value: '',
        onValueChange: (value: string) => commits.push(value),
        commitDelayMs: 90,
      }));
    });

    act(() => {
      input('antes de salir');
      textArea().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });

    expect(commits).toEqual(['antes de salir']);
  });
});
