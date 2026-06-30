import { type MutableRefObject, useEffect, useRef } from 'react';
import { perfDiagnostics } from '../core/perfDiagnostics';

export type TimerRef = MutableRefObject<number | null>;

export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function clearLowLatencyTimer(timerRef: TimerRef): void {
  if (timerRef.current === null) return;
  window.clearTimeout(timerRef.current);
  timerRef.current = null;
}

export function restartDelayCommitTimer(timerRef: TimerRef, delayMs: number, commitNow: () => string): void {
  clearLowLatencyTimer(timerRef);
  timerRef.current = window.setTimeout(() => {
    commitNow();
  }, delayMs);
}

export function startMaxDelayCommitTimer(timerRef: TimerRef, delayMs: number, commitNow: () => string): void {
  if (timerRef.current !== null) return;
  timerRef.current = window.setTimeout(() => {
    commitNow();
  }, delayMs);
}

export function recordLowLatencyInputChange({
  component,
  nextValue,
  keydownAt,
  inputAt,
  localSetAt,
  renderCount,
}: {
  component: string;
  nextValue: string;
  keydownAt: number | undefined;
  inputAt: number;
  localSetAt: number;
  renderCount: number;
}): number {
  const inputEventId = perfDiagnostics.recordInputChange({
    component,
    keydownAt,
    inputAt,
    localSetAt,
    valueLength: nextValue.length,
    renderCount,
  });
  window.requestAnimationFrame(() => {
    perfDiagnostics.recordInputPaint(inputEventId, performance.now());
  });
  return inputEventId;
}

export function focusTextareaAtEnd(
  textarea: HTMLTextAreaElement | null,
  options: { scroll?: boolean } = {},
): void {
  if (!textarea) return;
  const end = textarea.value.length;
  if (options.scroll !== false) {
    textarea.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(end, end);
}
