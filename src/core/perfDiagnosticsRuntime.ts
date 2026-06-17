import type {
  PerfDiagnosticsConfig,
  PerfDiagnosticsSnapshot,
  PerfLongTask,
  PerfTtsVoice,
} from './perfDiagnosticsTypes';
import { PerfDiagnosticsState } from './perfDiagnosticsState';
import type { PerfTtsUtteranceArgs } from './perfDiagnosticsTtsEvents';
import { PerfDiagnosticsInputActions, type PerfInputChangeArgs } from './perfDiagnosticsInputActions';
import { PerfDiagnosticsLifecycleRuntime } from './perfDiagnosticsLifecycleRuntime';
import { PerfDiagnosticsLongTaskActions } from './perfDiagnosticsLongTaskActions';
import { logPerfDiagnosticsEvent } from './perfDiagnosticsLogRuntime';
import { PerfDiagnosticsSpanActions } from './perfDiagnosticsSpanActions';
import { PerfDiagnosticsTtsActions } from './perfDiagnosticsTtsActions';

export class PerfDiagnostics {
  private readonly state = new PerfDiagnosticsState();
  private readonly lifecycle = new PerfDiagnosticsLifecycleRuntime({
    snapshot: () => this.snapshot(),
    reset: () => this.reset(),
    recordLongTask: (task) => this.recordLongTask(task),
    log: (event, payload) => this.log(event, payload),
  });
  private readonly input = new PerfDiagnosticsInputActions({
    state: this.state,
    isEnabled: () => this.isEnabled(),
  });
  private readonly longTasks = new PerfDiagnosticsLongTaskActions({
    state: this.state,
    isEnabled: () => this.isEnabled(),
  });
  private readonly spans = new PerfDiagnosticsSpanActions({
    state: this.state,
    isEnabled: () => this.isEnabled(),
    getSlowSpanThresholdMs: () => this.lifecycle.getSlowSpanThresholdMs(),
    log: (event, payload) => this.log(event, payload),
  });
  private readonly tts = new PerfDiagnosticsTtsActions({
    state: this.state,
    isEnabled: () => this.isEnabled(),
    log: (event, payload) => this.log(event, payload),
  });

  configure(config: PerfDiagnosticsConfig): boolean {
    return this.lifecycle.configure(config);
  }

  isEnabled(): boolean {
    return this.lifecycle.isEnabled();
  }

  reset(): void {
    this.state.reset();
  }

  dispose(): void {
    this.lifecycle.dispose();
  }

  recordRender(component: string, count: number): void {
    this.input.recordRender(component, count);
  }

  recordInputChange(args: PerfInputChangeArgs): number {
    return this.input.recordInputChange(args);
  }

  recordInputPaint(id: number, paintAt: number): void {
    this.input.recordInputPaint(id, paintAt);
  }

  recordInputCommit(id: number, commitAt: number): void {
    this.input.recordInputCommit(id, commitAt);
  }

  beginTtsPlay(source: string): number {
    return this.tts.beginTtsPlay(source);
  }

  beginTtsUtterance(args: PerfTtsUtteranceArgs): number {
    return this.tts.beginTtsUtterance(args);
  }

  recordTtsVoices(voices: PerfTtsVoice[]): void {
    this.tts.recordTtsVoices(voices);
  }

  recordTtsSpeak(utteranceId: number): void {
    this.tts.recordTtsSpeak(utteranceId);
  }

  recordTtsStart(utteranceId: number): void {
    this.tts.recordTtsStart(utteranceId);
  }

  recordTtsEnd(utteranceId: number): void {
    this.tts.recordTtsEnd(utteranceId);
  }

  recordTtsError(utteranceId: number, error: string): void {
    this.tts.recordTtsError(utteranceId, error);
  }

  recordLongTask(task: PerfLongTask): void {
    this.longTasks.recordLongTask(task);
  }

  recordSpan(name: string, startedAt: number, context?: Record<string, unknown>): void {
    this.spans.recordSpan(name, startedAt, context);
  }

  withSpan<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
    return this.spans.withSpan(name, fn, context);
  }

  startSpan(name: string, context?: Record<string, unknown>): () => void {
    return this.spans.startSpan(name, context);
  }

  snapshot(): PerfDiagnosticsSnapshot {
    return this.state.snapshot(this.isEnabled());
  }

  log(event: string, payload: unknown): void {
    logPerfDiagnosticsEvent({
      enabled: this.isEnabled(),
      event,
      payload,
    });
  }
}

export const perfDiagnostics = new PerfDiagnostics();
