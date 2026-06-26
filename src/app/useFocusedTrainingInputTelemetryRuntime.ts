import { useCallback } from 'react';
import type { SessionTelemetry } from '../types/dictation';
import {
  applyFocusedImmediateInputTelemetry,
} from './focusedTrainingInputTelemetry';

type WritableRef<T> = {
  current: T;
};

type FocusedTrainingInputTelemetryRuntimeOptions = {
  telemetryRef: WritableRef<SessionTelemetry | null | undefined>;
  ttsStartedAtMsRef: WritableRef<number | null>;
  ttsPracticeLiveTextRef: WritableRef<string>;
  ttsPracticeLastInputAtMsRef: WritableRef<number>;
  nowIso?: () => string;
  nowMs?: () => number;
};

export function useFocusedTrainingInputTelemetryRuntime({
  telemetryRef,
  ttsStartedAtMsRef,
  ttsPracticeLiveTextRef,
  ttsPracticeLastInputAtMsRef,
  nowIso = () => new Date().toISOString(),
  nowMs = () => performance.now(),
}: FocusedTrainingInputTelemetryRuntimeOptions) {
  return useCallback(
    (value: string): void => {
      const inputAtMs = nowMs();
      const next = applyFocusedImmediateInputTelemetry({
        value,
        telemetry: telemetryRef.current,
        ttsStartedAtMs: ttsStartedAtMsRef.current,
        nowIso,
        nowMs: () => inputAtMs,
      });

      telemetryRef.current = next.telemetry;
      ttsStartedAtMsRef.current = next.ttsStartedAtMs;
      ttsPracticeLiveTextRef.current = next.liveText;
      ttsPracticeLastInputAtMsRef.current = inputAtMs;
    },
    [nowIso, nowMs, telemetryRef, ttsPracticeLastInputAtMsRef, ttsPracticeLiveTextRef, ttsStartedAtMsRef],
  );
}
