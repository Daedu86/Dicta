import { PerfDiagnosticsState } from './perfDiagnosticsState';
import { now, roundMs } from './perfDiagnosticsUtils';

type PerfDiagnosticsLog = (event: string, payload: unknown) => void;

export function recordPerfDiagnosticsSlowSpan({
  enabled,
  state,
  slowSpanThresholdMs,
  name,
  startedAt,
  context,
  log,
}: {
  enabled: boolean;
  state: PerfDiagnosticsState;
  slowSpanThresholdMs: number;
  name: string;
  startedAt: number;
  context?: Record<string, unknown>;
  log: PerfDiagnosticsLog;
}): void {
  if (!enabled) return;
  const duration = now() - startedAt;
  if (duration < slowSpanThresholdMs) return;
  const span = {
    name,
    startedAt: roundMs(startedAt),
    duration: roundMs(duration),
    context,
  };
  state.addSlowSpan(span);
  log('slow-span', span);
}

export function runWithPerfDiagnosticsSpan<T>({
  enabled,
  name,
  fn,
  context,
  recordSpan,
}: {
  enabled: boolean;
  name: string;
  fn: () => T;
  context?: Record<string, unknown>;
  recordSpan: (name: string, startedAt: number, context?: Record<string, unknown>) => void;
}): T {
  if (!enabled) return fn();
  const startedAt = now();
  try {
    return fn();
  } finally {
    recordSpan(name, startedAt, context);
  }
}

export function startPerfDiagnosticsSpan({
  enabled,
  name,
  context,
  recordSpan,
}: {
  enabled: boolean;
  name: string;
  context?: Record<string, unknown>;
  recordSpan: (name: string, startedAt: number, context?: Record<string, unknown>) => void;
}): () => void {
  if (!enabled) return () => undefined;
  const startedAt = now();
  return () => recordSpan(name, startedAt, context);
}
