import {
  forwardRef,
  memo,
  type KeyboardEvent,
  type MutableRefObject,
  type TextareaHTMLAttributes,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { perfDiagnostics } from '../core/perfDiagnostics';

export type LowLatencyTextareaHandle = {
  flush: () => string;
  focus: () => void;
};

type LowLatencyTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'defaultValue' | 'onChange' | 'value'> & {
  value: string;
  onValueChange: (value: string) => void;
  onImmediateValueChange?: (value: string) => void;
  commitDelayMs?: number;
  maxCommitDelayMs?: number;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  syncKey?: string | number;
};

type TimerRef = MutableRefObject<number | null>;

const LOW_LATENCY_COMPONENT_NAME = 'LowLatencyTextarea';

const LowLatencyTextareaComponent = forwardRef<LowLatencyTextareaHandle, LowLatencyTextareaProps>(function LowLatencyTextarea(
  {
    value,
    onValueChange,
    onImmediateValueChange,
    commitDelayMs = 80,
    maxCommitDelayMs = 250,
    onBlur,
    onKeyDown,
    syncKey,
    ...textareaProps
  },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const localValueRef = useRef(value);
  const lastCommittedValueRef = useRef(value);
  const onValueChangeRef = useLatestRef(onValueChange);
  const onImmediateValueChangeRef = useLatestRef(onImmediateValueChange);
  const keydownAtRef = useRef<number | undefined>(undefined);
  const latestInputEventIdRef = useRef(0);
  const renderCountRef = useRef(0);
  const delayTimerRef = useRef<number | null>(null);
  const maxDelayTimerRef = useRef<number | null>(null);
  const lastSyncKeyRef = useRef(syncKey);
  renderCountRef.current += 1;

  useEffect(() => {
    perfDiagnostics.recordRender(LOW_LATENCY_COMPONENT_NAME, renderCountRef.current);
  });

  function clearTimers(): void {
    clearLowLatencyTimer(delayTimerRef);
    clearLowLatencyTimer(maxDelayTimerRef);
  }

  function readVisibleValue(): string {
    const nextValue = textareaRef.current?.value ?? localValueRef.current;
    localValueRef.current = nextValue;
    return nextValue;
  }

  function commitNow(): string {
    clearTimers();
    const nextValue = readVisibleValue();
    if (nextValue !== lastCommittedValueRef.current) {
      perfDiagnostics.recordInputCommit(latestInputEventIdRef.current, performance.now());
      lastCommittedValueRef.current = nextValue;
      onValueChangeRef.current(nextValue);
    }
    return nextValue;
  }

  function scheduleCommit(): void {
    restartDelayCommitTimer(delayTimerRef, commitDelayMs, commitNow);
    startMaxDelayCommitTimer(maxDelayTimerRef, maxCommitDelayMs, commitNow);
  }

  function setLocalAndSchedule(nextValue: string): void {
    const inputAt = performance.now();
    localValueRef.current = nextValue;
    onImmediateValueChangeRef.current?.(nextValue);
    const localSetAt = performance.now();
    const inputEventId = recordInputChange({
      nextValue,
      keydownAt: keydownAtRef.current,
      inputAt,
      localSetAt,
      renderCount: renderCountRef.current,
    });
    latestInputEventIdRef.current = inputEventId;
    scheduleCommit();
  }

  useImperativeHandle(
    ref,
    () => ({
      flush: commitNow,
      focus: () => focusTextareaAtEnd(textareaRef.current),
    }),
    [],
  );

  useLayoutEffect(() => {
    const syncKeyChanged = syncKey !== lastSyncKeyRef.current;
    if (!syncKeyChanged && value === lastCommittedValueRef.current) return;

    if (syncKeyChanged) {
      commitNow();
    } else {
      clearTimers();
    }
    lastSyncKeyRef.current = syncKey;
    lastCommittedValueRef.current = value;
    localValueRef.current = value;
    if (textareaRef.current && textareaRef.current.value !== value) {
      textareaRef.current.value = value;
    }
  }, [syncKey, value]);

  useEffect(
    () => () => {
      commitNow();
    },
    [],
  );

  return (
    <textarea
      {...textareaProps}
      ref={textareaRef}
      defaultValue={value}
      onChange={(event) => setLocalAndSchedule(event.target.value)}
      onBlur={(event) => {
        commitNow();
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        keydownAtRef.current = performance.now();
        onKeyDown?.(event);
        if (event.defaultPrevented && event.currentTarget.value !== localValueRef.current) {
          setLocalAndSchedule(event.currentTarget.value);
        }
      }}
    />
  );
});

function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function clearLowLatencyTimer(timerRef: TimerRef): void {
  if (timerRef.current === null) return;
  window.clearTimeout(timerRef.current);
  timerRef.current = null;
}

function restartDelayCommitTimer(timerRef: TimerRef, delayMs: number, commitNow: () => string): void {
  clearLowLatencyTimer(timerRef);
  timerRef.current = window.setTimeout(() => {
    commitNow();
  }, delayMs);
}

function startMaxDelayCommitTimer(timerRef: TimerRef, delayMs: number, commitNow: () => string): void {
  if (timerRef.current !== null) return;
  timerRef.current = window.setTimeout(() => {
    commitNow();
  }, delayMs);
}

function recordInputChange({
  nextValue,
  keydownAt,
  inputAt,
  localSetAt,
  renderCount,
}: {
  nextValue: string;
  keydownAt: number | undefined;
  inputAt: number;
  localSetAt: number;
  renderCount: number;
}): number {
  const inputEventId = perfDiagnostics.recordInputChange({
    component: LOW_LATENCY_COMPONENT_NAME,
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

function focusTextareaAtEnd(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) return;
  const end = textarea.value.length;
  textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(end, end);
}

export const LowLatencyTextarea = memo(LowLatencyTextareaComponent);
