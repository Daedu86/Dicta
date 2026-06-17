import type {
  PerfDiagnosticsConfig,
  PerfDiagnosticsSnapshot,
  PerfLongTask,
  PerfTtsVoice,
} from './perfDiagnosticsTypes';
import {
  DEFAULT_SLOW_SPAN_THRESHOLD_MS,
  getStandaloneMode,
  getUserAgent,
  isPerfDiagnosticsEnabled,
  roundMs,
} from './perfDiagnosticsUtils';
import { createPerfLongTaskObserver } from './perfDiagnosticsLongTaskObserver';
import { PerfDiagnosticsState } from './perfDiagnosticsState';
import type { PerfTtsUtteranceArgs } from './perfDiagnosticsTtsEvents';
import { installPerfDiagnosticsGlobal } from './perfDiagnosticsGlobalRuntime';
import {
  createPerfInputSample,
  markPerfInputCommit,
  markPerfInputPaint,
} from './perfDiagnosticsInputRuntime';
import {
  recordPerfDiagnosticsSlowSpan,
  runWithPerfDiagnosticsSpan,
  startPerfDiagnosticsSpan,
} from './perfDiagnosticsSpanRuntime';
import {
  beginPerfDiagnosticsTtsPlay,
  beginPerfDiagnosticsTtsUtterance,
  recordPerfDiagnosticsTtsEnd,
  recordPerfDiagnosticsTtsError,
  recordPerfDiagnosticsTtsSpeak,
  recordPerfDiagnosticsTtsStart,
  recordPerfDiagnosticsTtsVoices,
} from './perfDiagnosticsTtsRuntime';

export class PerfDiagnostics {
  private enabled = false;
  private slowSpanThresholdMs = DEFAULT_SLOW_SPAN_THRESHOLD_MS;
  private state = new PerfDiagnosticsState();
  private observer: PerformanceObserver | null = null;

  configure(config: PerfDiagnosticsConfig): boolean {
    this.enabled = isPerfDiagnosticsEnabled(config);
    this.slowSpanThresholdMs = config.slowSpanThresholdMs ?? DEFAULT_SLOW_SPAN_THRESHOLD_MS;
    if (this.enabled) {
      this.installGlobal();
      this.startLongTaskObserver();
      this.log('enabled', { userAgent: getUserAgent(), standalone: getStandaloneMode() });
    }
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  reset(): void {
    this.state.reset();
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  recordRender(component: string, count: number): void {
    if (!this.enabled) return;
    this.state.recordRender(component, count);
  }

  recordInputChange(args: {
    component: string;
    keydownAt?: number;
    inputAt: number;
    localSetAt: number;
    valueLength: number;
    renderCount: number;
  }): number {
    return createPerfInputSample(this.enabled, this.state, args);
  }

  recordInputPaint(id: number, paintAt: number): void {
    markPerfInputPaint(this.enabled, this.state, id, paintAt);
  }

  recordInputCommit(id: number, commitAt: number): void {
    markPerfInputCommit(this.enabled, this.state, id, commitAt);
  }

  beginTtsPlay(source: string): number {
    return beginPerfDiagnosticsTtsPlay(this.enabled, this.state, source);
  }

  beginTtsUtterance(args: PerfTtsUtteranceArgs): number {
    return beginPerfDiagnosticsTtsUtterance(this.enabled, this.state, args);
  }

  recordTtsVoices(voices: PerfTtsVoice[]): void {
    recordPerfDiagnosticsTtsVoices({
      state: this.state,
      enabled: this.enabled,
      voices,
      log: (event, payload) => this.log(event, payload),
    });
  }

  recordTtsSpeak(utteranceId: number): void {
    recordPerfDiagnosticsTtsSpeak(this.enabled, this.state, utteranceId);
  }

  recordTtsStart(utteranceId: number): void {
    recordPerfDiagnosticsTtsStart(this.enabled, this.state, utteranceId);
  }

  recordTtsEnd(utteranceId: number): void {
    recordPerfDiagnosticsTtsEnd(this.enabled, this.state, utteranceId);
  }

  recordTtsError(utteranceId: number, error: string): void {
    recordPerfDiagnosticsTtsError({
      enabled: this.enabled,
      state: this.state,
      utteranceId,
      error,
      log: (event, payload) => this.log(event, payload),
    });
  }

  recordLongTask(task: PerfLongTask): void {
    if (!this.enabled) return;
    this.state.addLongTask({
      name: task.name,
      startTime: roundMs(task.startTime),
      duration: roundMs(task.duration),
    });
  }

  recordSpan(name: string, startedAt: number, context?: Record<string, unknown>): void {
    recordPerfDiagnosticsSlowSpan({
      enabled: this.enabled,
      state: this.state,
      slowSpanThresholdMs: this.slowSpanThresholdMs,
      name,
      startedAt,
      context,
      log: (event, payload) => this.log(event, payload),
    });
  }

  withSpan<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
    return runWithPerfDiagnosticsSpan({
      enabled: this.enabled,
      name,
      fn,
      context,
      recordSpan: (spanName, startedAt, spanContext) => this.recordSpan(spanName, startedAt, spanContext),
    });
  }

  startSpan(name: string, context?: Record<string, unknown>): () => void {
    return startPerfDiagnosticsSpan({
      enabled: this.enabled,
      name,
      context,
      recordSpan: (spanName, startedAt, spanContext) => this.recordSpan(spanName, startedAt, spanContext),
    });
  }

  snapshot(): PerfDiagnosticsSnapshot {
    return this.state.snapshot(this.enabled);
  }

  log(event: string, payload: unknown): void {
    if (!this.enabled) return;
    console.info('[DictaPerf]', event, payload);
  }

  private startLongTaskObserver(): void {
    if (this.observer) return;
    this.observer = createPerfLongTaskObserver((task) => this.recordLongTask(task));
  }

  private installGlobal(): void {
    installPerfDiagnosticsGlobal({
      snapshot: () => this.snapshot(),
      reset: () => this.reset(),
      enabled: () => this.enabled,
    });
  }
}

export const perfDiagnostics = new PerfDiagnostics();
