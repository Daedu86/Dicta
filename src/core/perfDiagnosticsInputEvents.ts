import type { PerfInputEvent } from './perfDiagnosticsTypes';

type PerfInputChangeArgs = {
  component: string;
  keydownAt?: number;
  inputAt: number;
  localSetAt: number;
  valueLength: number;
  renderCount: number;
};

export function buildPerfInputEvent(id: number, args: PerfInputChangeArgs): PerfInputEvent {
  return {
    id,
    component: args.component,
    keydownAt: args.keydownAt,
    inputAt: args.inputAt,
    localSetAt: args.localSetAt,
    valueLength: args.valueLength,
    renderCount: args.renderCount,
    keydownToInputMs: args.keydownAt === undefined ? undefined : args.inputAt - args.keydownAt,
    inputToLocalSetMs: args.localSetAt - args.inputAt,
  };
}

export function recordPerfInputPaint(event: PerfInputEvent, paintAt: number): void {
  event.paintAt = paintAt;
  event.inputToPaintMs = paintAt - event.inputAt;
}

export function recordPerfInputCommit(event: PerfInputEvent, commitAt: number): void {
  event.commitAt = commitAt;
  event.inputToCommitMs = commitAt - event.inputAt;
}
