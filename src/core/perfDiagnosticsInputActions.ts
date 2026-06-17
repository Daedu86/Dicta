import { PerfDiagnosticsState } from './perfDiagnosticsState';
import {
  createPerfInputSample,
  markPerfInputCommit,
  markPerfInputPaint,
} from './perfDiagnosticsInputRuntime';

export type PerfInputChangeArgs = {
  component: string;
  keydownAt?: number;
  inputAt: number;
  localSetAt: number;
  valueLength: number;
  renderCount: number;
};

export type PerfDiagnosticsInputActionsOptions = {
  state: PerfDiagnosticsState;
  isEnabled: () => boolean;
};

export class PerfDiagnosticsInputActions {
  private readonly state: PerfDiagnosticsState;
  private readonly isEnabled: () => boolean;

  constructor({ state, isEnabled }: PerfDiagnosticsInputActionsOptions) {
    this.state = state;
    this.isEnabled = isEnabled;
  }

  recordRender(component: string, count: number): void {
    if (!this.isEnabled()) return;
    this.state.recordRender(component, count);
  }

  recordInputChange(args: PerfInputChangeArgs): number {
    return createPerfInputSample(this.isEnabled(), this.state, args);
  }

  recordInputPaint(id: number, paintAt: number): void {
    markPerfInputPaint(this.isEnabled(), this.state, id, paintAt);
  }

  recordInputCommit(id: number, commitAt: number): void {
    markPerfInputCommit(this.isEnabled(), this.state, id, commitAt);
  }
}
