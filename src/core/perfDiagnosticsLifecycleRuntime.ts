import type {
  PerfDiagnosticsConfig,
  PerfDiagnosticsSnapshot,
  PerfLongTask,
} from './perfDiagnosticsTypes';
import {
  DEFAULT_SLOW_SPAN_THRESHOLD_MS,
  getStandaloneMode,
  getUserAgent,
  isPerfDiagnosticsEnabled,
} from './perfDiagnosticsUtils';
import { createPerfLongTaskObserver } from './perfDiagnosticsLongTaskObserver';
import { installPerfDiagnosticsGlobal } from './perfDiagnosticsGlobalRuntime';

type PerfDiagnosticsLifecycleLog = (event: string, payload: unknown) => void;

export type PerfDiagnosticsLifecycleOptions = {
  snapshot: () => PerfDiagnosticsSnapshot;
  reset: () => void;
  recordLongTask: (task: PerfLongTask) => void;
  log: PerfDiagnosticsLifecycleLog;
};

export class PerfDiagnosticsLifecycleRuntime {
  private enabled = false;
  private slowSpanThresholdMs = DEFAULT_SLOW_SPAN_THRESHOLD_MS;
  private observer: PerformanceObserver | null = null;
  private readonly snapshot: () => PerfDiagnosticsSnapshot;
  private readonly reset: () => void;
  private readonly recordLongTask: (task: PerfLongTask) => void;
  private readonly log: PerfDiagnosticsLifecycleLog;

  constructor({
    snapshot,
    reset,
    recordLongTask,
    log,
  }: PerfDiagnosticsLifecycleOptions) {
    this.snapshot = snapshot;
    this.reset = reset;
    this.recordLongTask = recordLongTask;
    this.log = log;
  }

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

  getSlowSpanThresholdMs(): number {
    return this.slowSpanThresholdMs;
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private startLongTaskObserver(): void {
    if (this.observer) return;
    this.observer = createPerfLongTaskObserver((task) => this.recordLongTask(task));
  }

  private installGlobal(): void {
    installPerfDiagnosticsGlobal({
      snapshot: this.snapshot,
      reset: this.reset,
      enabled: () => this.enabled,
    });
  }
}
