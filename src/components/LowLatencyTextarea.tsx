import {
  forwardRef,
  memo,
  type KeyboardEvent,
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
  const onValueChangeRef = useRef(onValueChange);
  const onImmediateValueChangeRef = useRef(onImmediateValueChange);
  const keydownAtRef = useRef<number | undefined>(undefined);
  const latestInputEventIdRef = useRef(0);
  const renderCountRef = useRef(0);
  const delayTimerRef = useRef<number | null>(null);
  const maxDelayTimerRef = useRef<number | null>(null);
  const lastSyncKeyRef = useRef(syncKey);
  renderCountRef.current += 1;

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    onImmediateValueChangeRef.current = onImmediateValueChange;
  }, [onImmediateValueChange]);

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
    onImmediateValueChangeRef.current?.(nextValue);
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

  useImperativeHandle(ref, () => ({
    flush: commitNow,
    focus: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const end = textarea.value.length;
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(end, end);
    },
  }), []);

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

  useEffect(() => () => {
    commitNow();
  }, []);

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

export const LowLatencyTextarea = memo(LowLatencyTextareaComponent);
