import type { PerfLongTask } from './perfDiagnosticsTypes';
import { PerfDiagnosticsState } from './perfDiagnosticsState';
import { roundMs } from './perfDiagnosticsUtils';

export type PerfDiagnosticsLongTaskActionsOptions = {
  state: PerfDiagnosticsState;
  isEnabled: () => boolean;
};

export class PerfDiagnosticsLongTaskActions {
  private readonly state: PerfDiagnosticsState;
  private readonly isEnabled: () => boolean;

  constructor({ state, isEnabled }: PerfDiagnosticsLongTaskActionsOptions) {
    this.state = state;
    this.isEnabled = isEnabled;
  }

  recordLongTask(task: PerfLongTask): void {
    if (!this.isEnabled()) return;
    this.state.addLongTask({
      name: task.name,
      startTime: roundMs(task.startTime),
      duration: roundMs(task.duration),
    });
  }
}
