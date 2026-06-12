import { useMemo } from 'react';
import type {
  ControlAction,
  SessionTelemetry,
  TtsChunkTelemetry,
} from '../types/dictation';
import { trackAction } from '../core/telemetry';
import { cloneTelemetry } from '../core/sessionNormalization';

type WritableRef<T> = {
  current: T;
};

export type TtsTelemetryRecorder = {
  ensureAttemptTelemetry: () => SessionTelemetry;
  getTtsElapsedSeconds: (now?: number) => number;
  recordTtsTelemetryAction: (action: ControlAction, actionRate?: number) => void;
  recordTtsChunkTelemetry: (chunk: Omit<TtsChunkTelemetry, 't'>) => void;
};

export type TtsTelemetryRecorderOptions = {
  telemetryRef: WritableRef<SessionTelemetry | null>;
  ttsStartedAtMsRef: WritableRef<number | null>;
  ttsSpeechRate: number;
  nowMs?: () => number;
  nowIso?: () => string;
};

export function createTtsTelemetryRecorder({
  telemetryRef,
  ttsStartedAtMsRef,
  ttsSpeechRate,
  nowMs = () => performance.now(),
  nowIso = () => new Date().toISOString(),
}: TtsTelemetryRecorderOptions): TtsTelemetryRecorder {
  function ensureAttemptTelemetry(): SessionTelemetry {
    const next = cloneTelemetry(telemetryRef.current);
    if (!next.startedAt) {
      next.startedAt = nowIso();
    }
    telemetryRef.current = next;
    return next;
  }

  function getTtsElapsedSeconds(now = nowMs()): number {
    if (ttsStartedAtMsRef.current === null) {
      return 0;
    }
    return Math.max(0, (now - ttsStartedAtMsRef.current) / 1000);
  }

  function recordTtsTelemetryAction(action: ControlAction, actionRate = ttsSpeechRate): void {
    const telemetry = ensureAttemptTelemetry();
    const next = cloneTelemetry(telemetry);
    trackAction(next, getTtsElapsedSeconds(), action, actionRate);
    telemetryRef.current = next;
  }

  function recordTtsChunkTelemetry(chunk: Omit<TtsChunkTelemetry, 't'>): void {
    const telemetry = ensureAttemptTelemetry();
    const next = cloneTelemetry(telemetry);
    next.ttsChunks.push({
      t: getTtsElapsedSeconds(),
      ...chunk,
    });
    telemetryRef.current = next;
  }

  return {
    ensureAttemptTelemetry,
    getTtsElapsedSeconds,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
  };
}

export function useTtsTelemetryRecorder(options: TtsTelemetryRecorderOptions): TtsTelemetryRecorder {
  return useMemo(
    () => createTtsTelemetryRecorder(options),
    [
      options.nowIso,
      options.nowMs,
      options.telemetryRef,
      options.ttsSpeechRate,
      options.ttsStartedAtMsRef,
    ],
  );
}
