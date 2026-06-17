import { act, createElement, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';
import { LowLatencyTextarea } from '../../src/components/LowLatencyTextarea';
import { perfDiagnostics } from '../../src/core/perfDiagnostics';

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

export function setupLowLatencyTextareaHarness(): void {
  vi.useFakeTimers();
  perfDiagnostics.configure({ envDev: false, search: '?perf=1', storage: window.localStorage });
  perfDiagnostics.reset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
}

export function cleanupLowLatencyTextareaHarness(): void {
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
}

export function textArea(): HTMLTextAreaElement {
  const element = host.querySelector('textarea');
  if (!element) throw new Error('textarea not rendered');
  return element;
}

export function inputLowLatencyTextarea(value: string): void {
  const element = textArea();
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  valueSetter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export function renderLowLatencyTextarea(props: ComponentProps<typeof LowLatencyTextarea>): void {
  act(() => {
    root.render(createElement(LowLatencyTextarea, props));
  });
}
