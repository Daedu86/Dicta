import type {
  FocusedTrainingRuntimeDelegateArgs,
  UseFocusedTrainingRuntimeArgs,
} from '../focusedTrainingRuntimeDelegateTypes';

export function buildFocusedTrainingPlaybackIntervalsArgs(
  args: UseFocusedTrainingRuntimeArgs,
): FocusedTrainingRuntimeDelegateArgs['playbackIntervals'] {
  return {
    activeInputMode: args.activeInputMode,
    activeSessionFinished: args.activeSessionFinished,
    ttsStatus: args.ttsStatus,
    applyTtsPerformanceSampleRef: args.applyTtsPerformanceSampleRef,
    setTtsPlayerProgressTick: args.setTtsPlayerProgressTick,
  };
}
