import { useKeyboardRemapRuntime } from './useKeyboardRemapRuntime';
import { useTtsPracticeInputRuntime } from './useTtsPracticeInputRuntime';
import { useTtsPlaybackMetricsRuntime } from './useTtsPlaybackMetricsRuntime';
import { useBrowserTtsPlaybackLoop } from './useBrowserTtsPlaybackLoop';
import { useTtsPlaybackControls } from './useTtsPlaybackControls';
import { useResetSessionRuntime } from './useResetSessionRuntime';
import { useTtsSessionSubmitAction } from './useTtsSessionSubmitAction';
import {
  buildTtsSessionOrchestrationDelegateArgs,
  type UseTtsSessionOrchestrationRuntimeArgs,
} from './ttsSessionOrchestrationDelegateArgs';
import { buildSemanticPhrasesForTtsSession } from './ttsSessionSemanticPhrases';
import { applyPendingTtsPracticePunctuation } from './ttsPracticePunctuation';
import type { TtsPacingMode } from '../types/dictation';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';

export function useTtsSessionOrchestrationRuntime(args: UseTtsSessionOrchestrationRuntimeArgs) {
  function buildSemanticPhrasesForCurrentSession(
    text: string,
    language: string | undefined,
    mode: TtsPacingMode,
  ): SemanticPhrase[] {
    return buildSemanticPhrasesForTtsSession(args.activeSession, text, language, mode);
  }

  const delegateArgs = buildTtsSessionOrchestrationDelegateArgs(
    args,
    buildSemanticPhrasesForCurrentSession,
  );

  const {
    getActiveTypingLanguage,
    handleEsKeyboardRemapKeyDown,
  } = useKeyboardRemapRuntime(delegateArgs.keyboardRemap);

  const {
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
  } = useTtsPracticeInputRuntime({
    ...delegateArgs.practiceInput,
    handleEsKeyboardRemapKeyDown,
  });

  const {
    ensureAttemptTelemetry,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
    estimateTtsSpokenWordIndex,
    applyTtsPerformanceSample,
  } = useTtsPlaybackMetricsRuntime(delegateArgs.playbackMetrics);

  const {
    playTts,
    playTtsFromWord,
  } = useBrowserTtsPlaybackLoop({
    ...delegateArgs.browserPlayback,
    estimateTtsSpokenWordIndex,
    ensureAttemptTelemetry,
    recordTtsTelemetryAction,
    recordTtsChunkTelemetry,
    applyTtsPerformanceSample,
  });

  const {
    pauseTts,
    resumeTts,
    stopTtsPlayback,
    seekTtsPlayback,
  } = useTtsPlaybackControls({
    ...delegateArgs.playbackControls,
    estimateTtsSpokenWordIndex,
    playTtsFromWord,
    recordTtsTelemetryAction,
  });

  const resetSession = useResetSessionRuntime({
    ...delegateArgs.resetSession,
    stopTtsPlayback,
  });

  const submitTtsSession = useTtsSessionSubmitAction({
    ...delegateArgs.submitSession,
    applyTtsPerformanceSample,
    stopTtsPlayback,
  });

  function punctuateCompletedTtsPracticeText(latestPracticeText?: string): string {
    return applyPendingTtsPracticePunctuation({
      activeInputMode: args.activeInputMode,
      ttsText: args.ttsText,
      completedWordCount: args.ttsCompletedSourceWordsRef.current,
      ttsPracticeLiveTextRef: args.ttsPracticeLiveTextRef,
      setTtsPracticeText: args.setTtsPracticeText,
      latestPracticeText,
    });
  }

  args.stopTtsPlaybackRef.current = stopTtsPlayback;

  return {
    getActiveTypingLanguage,
    onTtsPracticeChange,
    onTtsPracticeKeyDown,
    estimateTtsSpokenWordIndex,
    applyTtsPerformanceSample,
    playTts,
    playTtsFromWord,
    pauseTts,
    resumeTts,
    stopTtsPlayback,
    seekTtsPlayback,
    resetSession,
    punctuateCompletedTtsPracticeText,
    submitTtsSession,
  };
}
