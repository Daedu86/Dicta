import {
  buildFocusedTrainingActiveSessionSyncArgs,
  buildFocusedTrainingLiveMetricsArgs,
  buildFocusedTrainingPlaybackIntervalsArgs,
  buildFocusedTrainingRouteArgs,
  buildFocusedTrainingTtsOrchestrationArgs,
} from './focusedTrainingRuntimeDelegateArgSections';
import type {
  FocusedTrainingRuntimeDelegateArgs,
  UseFocusedTrainingRuntimeArgs,
} from './focusedTrainingRuntimeDelegateTypes';

export type {
  FocusedTrainingRuntimeDelegateArgs,
  UseFocusedTrainingRuntimeArgs,
} from './focusedTrainingRuntimeDelegateTypes';

export function buildFocusedTrainingRuntimeDelegateArgs(
  args: UseFocusedTrainingRuntimeArgs,
): FocusedTrainingRuntimeDelegateArgs {
  return {
    liveMetrics: buildFocusedTrainingLiveMetricsArgs(args),
    playbackIntervals: buildFocusedTrainingPlaybackIntervalsArgs(args),
    activeSessionSync: buildFocusedTrainingActiveSessionSyncArgs(args),
    ttsOrchestration: buildFocusedTrainingTtsOrchestrationArgs(args),
    focusedRoute: buildFocusedTrainingRouteArgs(args),
  };
}
