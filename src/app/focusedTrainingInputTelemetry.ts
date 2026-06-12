import type { SessionTelemetry } from '../types/dictation';
import { cloneTelemetry } from '../core/sessionNormalization';

export type FocusedImmediateInputTelemetryInput = {
  value: string;
  telemetry: SessionTelemetry | null | undefined;
  ttsStartedAtMs: number | null;
  nowIso: () => string;
  nowMs: () => number;
};

export type FocusedImmediateInputTelemetryResult = {
  telemetry: SessionTelemetry;
  ttsStartedAtMs: number;
  liveText: string;
};

export function applyFocusedImmediateInputTelemetry({
  value,
  telemetry,
  ttsStartedAtMs,
  nowIso,
  nowMs,
}: FocusedImmediateInputTelemetryInput): FocusedImmediateInputTelemetryResult {
  const nextTelemetry =
    telemetry && telemetry.startedAt
      ? telemetry
      : {
          ...cloneTelemetry(telemetry),
          startedAt: nowIso(),
        };

  return {
    telemetry: nextTelemetry,
    ttsStartedAtMs: ttsStartedAtMs === null ? nowMs() : ttsStartedAtMs,
    liveText: value,
  };
}
