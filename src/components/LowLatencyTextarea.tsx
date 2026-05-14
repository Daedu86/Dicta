import {
  forwardRef,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { perfDiagnostics } from '../core/perfDiagnostics';

export type LowLatencyTextareaHandle = {
  flush: () => string;
};

type LowLatencyTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  value: string;
  onValueChange: (value: string) => void;
  commitDelayMs?: number;
  maxCommitDelayMs?: number;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export const LowLatencyTextarea = forwardRef<LowLatencyTextareaHandle, LowLatencyTextareaProps>(function LowLatencyTextarea(
  {
    value,
    onValueChange,
    commitDelayMs = 80,
    maxCommitDelayMs = 250,
    onBlur,
    onKeyDown,
    ...textareaProps
  },
  ref,
) {
  const [localValue, setLocalValue] = useState(value);
  const localValueRef = useRef(value);
  const lastCommittedValueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const keydownAtRef = useRef<number | undefined>(undefined);
  const latestInputEventIdRef = useRef(0);
  const renderCountRef = useRef(0);
  const delayTimerRef = useRef<number | null>(null);
  const maxDelayTimerRef = useRef<number | null>(null);
  renderCountRef.current += 1;

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    perfDiagnostics.recordRender('LowLatencyTextarea', renderCountRef.current);
  });

  function clearTimers(): void {
    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (maxDelayTimerRef.current !== null) {
      window.clearTimeout(maxDelayTimerRef.current);
      maxDelayTimerRef.current = null;
    }
  }

  function commitNow(): string {
    clearTimers();
    const nextValue = localValueRef.current;
    if (nextValue !== lastCommittedValueRef.current) {
      perfDiagnostics.recordInputCommit(latestInputEventIdRef.current, performance.now());
      lastCommittedValueRef.current = nextValue;
      onValueChangeRef.current(nextValue);
    }
    return nextValue;
  }

  function scheduleCommit(): void {
    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current);
    }
    delayTimerRef.current = window.setTimeout(() => {
      commitNow();
    }, commitDelayMs);

    if (maxDelayTimerRef.current === null) {
      maxDelayTimerRef.current = window.setTimeout(() => {
        commitNow();
      }, maxCommitDelayMs);
    }
  }

  function setLocalAndSchedule(nextValue: string): void {
    const inputAt = performance.now();
    localValueRef.current = nextValue;
    setLocalValue(nextValue);
    const localSetAt = performance.now();
    const inputEventId = perfDiagnostics.recordInputChange({
      component: 'LowLatencyTextarea',
      keydownAt: keydownAtRef.current,
      inputAt,
      localSetAt,
      valueLength: nextValue.length,
      renderCount: renderCountRef.current,
    });
    latestInputEventIdRef.current = inputEventId;
    window.requestAnimationFrame(() => {
      perfDiagnostics.recordInputPaint(inputEventId, performance.now());
    });
    scheduleCommit();
  }

  useImperativeHandle(ref, () => ({ flush: commitNow }), []);

  useEffect(() => {
    if (value === lastCommittedValueRef.current) return;
    clearTimers();
    lastCommittedValueRef.current = value;
    localValueRef.current = value;
    setLocalValue(value);
  }, [value]);

  useEffect(() => () => {
    commitNow();
  }, []);

  return (
    <textarea
      {...textareaProps}
      value={localValue}
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
