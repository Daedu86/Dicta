import {
  forwardRef,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

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
  const delayTimerRef = useRef<number | null>(null);
  const maxDelayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

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
    localValueRef.current = nextValue;
    setLocalValue(nextValue);
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
        onKeyDown?.(event);
        if (event.defaultPrevented && event.currentTarget.value !== localValueRef.current) {
          setLocalAndSchedule(event.currentTarget.value);
        }
      }}
    />
  );
});
