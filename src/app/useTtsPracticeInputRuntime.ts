import type {
  Dispatch,
  KeyboardEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type {
  SessionTelemetry,
} from '../types/dictation';
import { cloneTelemetry } from '../core/sessionNormalization';

type KeyboardRemapHandler = (
  event: KeyboardEvent<HTMLTextAreaElement>,
  applyValue: (value: string) => void,
) => void;

export type TtsPracticeInputRuntimeOptions = {
  activeSessionFinished: boolean;
  telemetryRef: MutableRefObject<SessionTelemetry | null>;
  ttsStartedAtMsRef: MutableRefObject<number | null>;
  ttsPracticeLiveTextRef: MutableRefObject<string>;
  setTtsPracticeText: Dispatch<SetStateAction<string>>;
  handleEsKeyboardRemapKeyDown: KeyboardRemapHandler;
};

export type TtsPracticeInputRuntime = {
  onTtsPracticeChange: (value: string) => void;
  onTtsPracticeKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function createTtsPracticeInputRuntime({
  activeSessionFinished,
  telemetryRef,
  ttsStartedAtMsRef,
  ttsPracticeLiveTextRef,
  setTtsPracticeText,
  handleEsKeyboardRemapKeyDown,
}: TtsPracticeInputRuntimeOptions): TtsPracticeInputRuntime {
  function onTtsPracticeChange(value: string): void {
    if (activeSessionFinished) return;
    if (!telemetryRef.current || !telemetryRef.current.startedAt) {
      telemetryRef.current = { ...cloneTelemetry(telemetryRef.current), startedAt: new Date().toISOString() };
    }
    if (ttsStartedAtMsRef.current === null) {
      ttsStartedAtMsRef.current = performance.now();
    }
    ttsPracticeLiveTextRef.current = value;
    setTtsPracticeText(value);
  }

  function onTtsPracticeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    handleEsKeyboardRemapKeyDown(event, onTtsPracticeChange);
  }

  return {
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
  };
}

export function useTtsPracticeInputRuntime(options: TtsPracticeInputRuntimeOptions): TtsPracticeInputRuntime {
  return createTtsPracticeInputRuntime(options);
}
