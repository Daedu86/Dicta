import { useFocusedTrainingLiveMetrics } from './useFocusedTrainingLiveMetrics';
import { useTtsPlaybackIntervalsRuntime } from './useTtsPlaybackIntervalsRuntime';
import { useActiveSessionStateSync } from './useActiveSessionStateSync';
import { useTtsSessionOrchestrationRuntime } from './useTtsSessionOrchestrationRuntime';
import { useFocusedTrainingRouteRuntime } from './useFocusedTrainingRouteRuntime';
import {
  buildFocusedTrainingRuntimeDelegateArgs,
  type UseFocusedTrainingRuntimeArgs,
} from './focusedTrainingRuntimeDelegateArgs';
import { useBrowserTtsPracticeChunkRuntime } from './useBrowserTtsPracticeChunkRuntime';

export function useFocusedTrainingRuntime(args: UseFocusedTrainingRuntimeArgs) {
  const delegateArgs = buildFocusedTrainingRuntimeDelegateArgs(args);
  const practiceChunkRuntime = useBrowserTtsPracticeChunkRuntime({
    activeSession: args.activeSession,
    activeSessionFinished: args.activeSessionFinished,
    ttsPracticeText: args.ttsPracticeText,
    setTtsPracticeText: args.setTtsPracticeText,
    telemetryRef: args.telemetryRef,
    ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
  });
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
    transformPracticeText: practiceChunkRuntime.enabled
      ? practiceChunkRuntime.transformCommittedDraft
      : undefined,
    practiceChunkAdvanceRequestRef: practiceChunkRuntime.practiceChunkAdvanceRequestRef,
    onPracticeChunkPlan: practiceChunkRuntime.onPracticeChunkPlan,
    onPracticeChunkResolved: practiceChunkRuntime.onPracticeChunkResolved,
    onFinalPracticeChunkAudioCompleted: practiceChunkRuntime.onFinalPracticeChunkAudioCompleted,
  });

  practiceChunkRuntime.finishSessionRef.current = submitTtsSession;
  const resetSessionWithPracticeChunks = (options?: Parameters<typeof resetSession>[0]) => {
    practiceChunkRuntime.resetPracticeChunks();
    resetSession(options);
  };

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
    resetSession: resetSessionWithPracticeChunks,
    playTts,
    resumeTts,
    pauseTts,
    stopTtsPlayback,
    punctuateTtsPracticeText: punctuateCompletedTtsPracticeText,
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
    submitTtsSession,
    practiceChunkRuntime,
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
