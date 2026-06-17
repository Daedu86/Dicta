import { PerfDiagnosticsState } from './perfDiagnosticsState';
import {
  recordPerfDiagnosticsSlowSpan,
  runWithPerfDiagnosticsSpan,
  startPerfDiagnosticsSpan,
} from './perfDiagnosticsSpanRuntime';

type PerfDiagnosticsSpanLog = (event: string, payload: unknown) => void;

export type PerfDiagnosticsSpanActionsOptions = {
  state: PerfDiagnosticsState;
  isEnabled: () => boolean;
  getSlowSpanThresholdMs: () => number;
  log: PerfDiagnosticsSpanLog;
};

export class PerfDiagnosticsSpanActions {
  private readonly state: PerfDiagnosticsState;
  private readonly isEnabled: () => boolean;
  private readonly getSlowSpanThresholdMs: () => number;
  private readonly log: PerfDiagnosticsSpanLog;

  constructor({
    state,
    isEnabled,
    getSlowSpanThresholdMs,
    log,
  }: PerfDiagnosticsSpanActionsOptions) {
    this.state = state;
    this.isEnabled = isEnabled;
    this.getSlowSpanThresholdMs = getSlowSpanThresholdMs;
    this.log = log;
  }

  recordSpan(name: string, startedAt: number, context?: Record<string, unknown>): void {
    recordPerfDiagnosticsSlowSpan({
      enabled: this.isEnabled(),
      state: this.state,
      slowSpanThresholdMs: this.getSlowSpanThresholdMs(),
      name,
      startedAt,
      context,
      log: this.log,
    });
  }

  withSpan<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
    return runWithPerfDiagnosticsSpan({
      enabled: this.isEnabled(),
      name,
      fn,
      context,
      recordSpan: (spanName, startedAt, spanContext) => this.recordSpan(spanName, startedAt, spanContext),
    });
  }

  startSpan(name: string, context?: Record<string, unknown>): () => void {
    return startPerfDiagnosticsSpan({
      enabled: this.isEnabled(),
      name,
      context,
      recordSpan: (spanName, startedAt, spanContext) => this.recordSpan(spanName, startedAt, spanContext),
    });
  }
}
