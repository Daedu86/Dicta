import { useFocusedTrainingLiveMetrics } from './useFocusedTrainingLiveMetrics';
import { useTtsPlaybackIntervalsRuntime } from './useTtsPlaybackIntervalsRuntime';
import { useActiveSessionStateSync } from './useActiveSessionStateSync';
import { useTtsSessionOrchestrationRuntime } from './useTtsSessionOrchestrationRuntime';
import { useFocusedTrainingRouteRuntime } from './useFocusedTrainingRouteRuntime';
import {
  buildFocusedTrainingRuntimeDelegateArgs,
  type UseFocusedTrainingRuntimeArgs,
} from './focusedTrainingRuntimeDelegateArgs';

export function useFocusedTrainingRuntime(args: UseFocusedTrainingRuntimeArgs) {
  const delegateArgs = buildFocusedTrainingRuntimeDelegateArgs(args);
  const {
    ttsHasText,
    ttsTranscript,
    activePoints,
    activeVisibleAccuracy,
    activeVisibleScore,
    activeLivePointsLabel,
    activeLiveScoreHelpText,
    activeLivePointsHelpText,
    activeLiveAccuracyHelpText,
  } = useFocusedTrainingLiveMetrics(delegateArgs.liveMetrics);

  useTtsPlaybackIntervalsRuntime({
    ...delegateArgs.playbackIntervals,
    ttsHasText,
    tickMs: args.config.tickMs,
  });

  useActiveSessionStateSync({
    ...delegateArgs.activeSessionSync,
    activeVisibleAccuracy,
    activeVisibleScore,
    activePoints,
  });

  const {
    getActiveTypingLanguage,
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
    estimateTtsSpokenWordIndex,
    playTts,
    pauseTts,
    resumeTts,
    stopTtsPlayback,
    seekTtsPlayback,
    resetSession,
    punctuateCompletedTtsPracticeText,
    submitTtsSession,
  } = useTtsSessionOrchestrationRuntime({
    ...delegateArgs.ttsOrchestration,
    ttsTranscript,
    ttsHasText,
  });

  const { focusedTrainingProps } = useFocusedTrainingRouteRuntime({
    ...delegateArgs.focusedRoute,
    activeVisibleScore,
    activeLiveScoreHelpText,
    activeLivePointsLabel,
    activeLivePointsHelpText,
    activeVisibleAccuracy,
    activeLiveAccuracyHelpText,
    ttsHasText,
    ttsTranscript,
    estimateTtsSpokenWordIndex,
    seekTtsPlayback,
    resetSession,
    playTts,
    resumeTts,
    pauseTts,
    stopTtsPlayback,
    punctuateTtsPracticeText: punctuateCompletedTtsPracticeText,
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
    submitTtsSession,
  });

  return {
    focusedTrainingProps,
    getActiveTypingLanguage,
    stopFocusedTrainingPlayback: () => {
      if (args.ttsStatus === 'playing') {
        stopTtsPlayback();
      }
    },
  };
}
