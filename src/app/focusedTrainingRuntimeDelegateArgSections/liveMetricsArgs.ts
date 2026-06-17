import type {
  FocusedTrainingRuntimeDelegateArgs,
  UseFocusedTrainingRuntimeArgs,
} from '../focusedTrainingRuntimeDelegateTypes';

export function buildFocusedTrainingLiveMetricsArgs(
  args: UseFocusedTrainingRuntimeArgs,
): FocusedTrainingRuntimeDelegateArgs['liveMetrics'] {
  return {
    activeInputMode: args.activeInputMode,
    ttsText: args.ttsText,
    ttsPracticeText: args.ttsPracticeText,
    lagSec: args.lagSec,
    wpm: args.wpm,
    rate: args.rate,
  };
}
