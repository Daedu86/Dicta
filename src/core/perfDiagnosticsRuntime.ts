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
  now,
  roundMs,
} from './perfDiagnosticsUtils';
import {
  buildPerfInputEvent,
  recordPerfInputCommit,
  recordPerfInputPaint,
} from './perfDiagnosticsInputEvents';
import { createPerfLongTaskObserver } from './perfDiagnosticsLongTaskObserver';
import { PerfDiagnosticsState } from './perfDiagnosticsState';
import {
  buildPerfTtsUtterance,
  recordPerfTtsEnd,
  recordPerfTtsError,
  recordPerfTtsSpeak,
  recordPerfTtsStart,
  type PerfTtsUtteranceArgs,
} from './perfDiagnosticsTtsEvents';

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
    if (!this.enabled) return 0;
    const id = this.state.nextInputEventId();
    const event = buildPerfInputEvent(id, args);
    this.state.addInputEvent(event);
    return id;
  }

  recordInputPaint(id: number, paintAt: number): void {
    if (!this.enabled || id <= 0) return;
    const event = this.state.getInputEvent(id);
    if (!event) return;
    recordPerfInputPaint(event, paintAt);
  }

  recordInputCommit(id: number, commitAt: number): void {
    if (!this.enabled || id <= 0) return;
    const event = this.state.getInputEvent(id);
    if (!event) return;
    recordPerfInputCommit(event, commitAt);
  }

  beginTtsPlay(source: string): number {
    if (!this.enabled) return 0;
    const id = this.state.nextTtsPlayIdentifier();
    this.state.setTtsPlay({ id, clickedAt: now(), source });
    return id;
  }

  beginTtsUtterance(args: PerfTtsUtteranceArgs): number {
    if (!this.enabled) return 0;
    const play = this.state.getTtsPlay(args.playId);
    const id = this.state.nextTtsUtteranceIdentifier();
    const utterance = buildPerfTtsUtterance(id, args, play?.clickedAt ?? now());
    this.state.addTtsUtterance(utterance);
    return id;
  }

  recordTtsVoices(voices: PerfTtsVoice[]): void {
    this.state.setTtsVoices(voices);
    if (!this.enabled) return;
    this.log('tts-voices', {
      count: voices.length,
      voices: voices.map((voice) => `${voice.lang} ${voice.name} (${voice.voiceURI})`),
    });
  }

  recordTtsSpeak(utteranceId: number): void {
    const utterance = this.state.getTtsUtterance(utteranceId);
    if (!this.enabled || !utterance) return;
    recordPerfTtsSpeak(utterance);
  }

  recordTtsStart(utteranceId: number): void {
    const utterance = this.state.getTtsUtterance(utteranceId);
    if (!this.enabled || !utterance) return;
    recordPerfTtsStart(utterance);
  }

  recordTtsEnd(utteranceId: number): void {
    const utterance = this.state.getTtsUtterance(utteranceId);
    if (!this.enabled || !utterance) return;
    recordPerfTtsEnd(utterance);
  }

  recordTtsError(utteranceId: number, error: string): void {
    const utterance = this.state.getTtsUtterance(utteranceId);
    if (!this.enabled || !utterance) return;
    recordPerfTtsError(utterance, error);
    this.log('tts-error', utterance);
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
    if (!this.enabled) return;
    const duration = now() - startedAt;
    if (duration < this.slowSpanThresholdMs) return;
    const span = {
      name,
      startedAt: roundMs(startedAt),
      duration: roundMs(duration),
      context,
    };
    this.state.addSlowSpan(span);
    this.log('slow-span', span);
  }

  withSpan<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
    if (!this.enabled) return fn();
    const startedAt = now();
    try {
      return fn();
    } finally {
      this.recordSpan(name, startedAt, context);
    }
  }

  startSpan(name: string, context?: Record<string, unknown>): () => void {
    if (!this.enabled) return () => undefined;
    const startedAt = now();
    return () => this.recordSpan(name, startedAt, context);
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
    if (typeof window === 'undefined') return;
    window.__DICTA_PERF__ = {
      snapshot: () => this.snapshot(),
      reset: () => this.reset(),
      enabled: () => this.enabled,
    };
  }
}

export const perfDiagnostics = new PerfDiagnostics();
