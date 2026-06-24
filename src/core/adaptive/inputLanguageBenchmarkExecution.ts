import type {
  AdaptiveTimelinePoint,
  InputExecutionTelemetry,
} from './types';
import { average, clamp01 } from './inputLanguageBenchmarkMath';

export function computeExecutionFidelity(execution?: InputExecutionTelemetry): number {
  if (!execution) return 1;
  const scores: number[] = [];
  if (execution.requestedPlaybackRate !== undefined && execution.actualPlaybackRate !== undefined) {
    scores.push(clamp01(1 - Math.abs(execution.requestedPlaybackRate - execution.actualPlaybackRate) / 0.25));
  }
  if (execution.requestedPauseMs !== undefined && execution.actualPauseMs !== undefined) {
    scores.push(execution.pauseGateResolutionReason === 'completed'
      ? 1
      : clamp01(1 - Math.max(0, execution.requestedPauseMs - execution.actualPauseMs) / 1000));
  }
  if (execution.requestedReplay !== undefined && execution.replayExecuted !== undefined) {
    scores.push(execution.requestedReplay === execution.replayExecuted ? 1 : 0.35);
  }
  if (execution.requestedBoundaryType && execution.actualBoundaryType) {
    scores.push(execution.requestedBoundaryType === execution.actualBoundaryType ? 1 : 0.55);
  }
  if (execution.fallbackUsed) scores.push(0.75);
  return scores.length > 0 ? average(scores) : 1;
}

export function computeAverageInputExecutionFidelity(timeline: AdaptiveTimelinePoint[]): number {
  return timeline.length > 0 ? 1 : 0;
}
