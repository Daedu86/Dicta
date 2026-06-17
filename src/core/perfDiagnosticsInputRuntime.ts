import { buildPerfInputEvent, recordPerfInputCommit, recordPerfInputPaint } from './perfDiagnosticsInputEvents';
import { PerfDiagnosticsState } from './perfDiagnosticsState';

type InputChangeArgs = {
  component: string;
  keydownAt?: number;
  inputAt: number;
  localSetAt: number;
  valueLength: number;
  renderCount: number;
};

export function createPerfInputSample(
  enabled: boolean,
  state: PerfDiagnosticsState,
  args: InputChangeArgs,
): number {
  if (!enabled) return 0;
  const id = state.nextInputEventId();
  const event = buildPerfInputEvent(id, args);
  state.addInputEvent(event);
  return id;
}

export function markPerfInputPaint(
  enabled: boolean,
  state: PerfDiagnosticsState,
  id: number,
  paintAt: number,
): void {
  if (!enabled || id <= 0) return;
  const event = state.getInputEvent(id);
  if (!event) return;
  recordPerfInputPaint(event, paintAt);
}

export function markPerfInputCommit(
  enabled: boolean,
  state: PerfDiagnosticsState,
  id: number,
  commitAt: number,
): void {
  if (!enabled || id <= 0) return;
  const event = state.getInputEvent(id);
  if (!event) return;
  recordPerfInputCommit(event, commitAt);
}
