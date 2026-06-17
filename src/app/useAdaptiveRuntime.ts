import type { AdaptiveRuntime, AdaptiveRuntimeOptions } from './adaptiveRuntimeTypes';
import { useAdaptiveRuntimeBenchmarkCallbacks } from './useAdaptiveRuntimeBenchmarkCallbacks';
import { useAdaptiveRuntimeFeedbackCallbacks } from './useAdaptiveRuntimeFeedbackCallbacks';
import { useAdaptiveRuntimeSelectors } from './useAdaptiveRuntimeSelectors';
import { useAdaptiveRuntimeState } from './adaptiveRuntimeState';

export type {
  AdaptiveRuntime,
  AdaptiveRuntimeOptions,
  AdaptiveRuntimeRecordBenchmarkOptions,
  AdaptiveRuntimeSessionInput,
  AdaptiveRuntimeSessionInputMode,
  AdaptiveRuntimeSessionSource,
  AdaptiveRuntimeSessionStatus,
} from './adaptiveRuntimeTypes';

export function useAdaptiveRuntime({
  activeSession,
  activeSessionId,
  sessions,
  setAdaptiveBenchmarks,
  adaptiveBenchmarksRef,
  adaptiveSessionFeedback,
  setAdaptiveSessionFeedback,
  adaptiveSessionFeedbackRef,
  persistAdaptiveSessionFeedbackNow,
  selectedBenchmarkLanguage,
  setSelectedBenchmarkLanguage,
}: AdaptiveRuntimeOptions): AdaptiveRuntime {
  const runtimeState = useAdaptiveRuntimeState();
  const {
    adaptiveControllerRef,
    adaptiveControllersByInputLanguageRef,
    historyServiceRef,
    adaptiveBenchmarkLastUpdateRef,
    sessionBenchmarkBeforeRef,
    sessionFeedbackContextRef,
    phrasePlaybackEventsRef,
    phrasePlaybackTotalPhrasesRef,
    selectedBenchmarkInputMode,
    setSelectedBenchmarkInputMode,
  } = runtimeState;

  const {
    getAdaptiveController,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
  } = useAdaptiveRuntimeSelectors({
    sessions,
    adaptiveControllersByInputLanguageRef,
    adaptiveBenchmarksRef,
    historyServiceRef,
  });

  const { recordAdaptiveBenchmark } = useAdaptiveRuntimeBenchmarkCallbacks({
    activeSessionId,
    setAdaptiveBenchmarks,
    adaptiveBenchmarksRef,
    adaptiveBenchmarkLastUpdateRef,
  });

  const {
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    completeAdaptiveSessionFeedback,
    ensureLatestBrowserTtsDeDictationScriptFeedback,
    resetAdaptiveSessionFeedbackTracking,
  } = useAdaptiveRuntimeFeedbackCallbacks({
    activeSession,
    activeSessionId,
    adaptiveSessionFeedback,
    setAdaptiveSessionFeedback,
    adaptiveSessionFeedbackRef,
    persistAdaptiveSessionFeedbackNow,
    adaptiveControllersByInputLanguageRef,
    sessionBenchmarkBeforeRef,
    sessionFeedbackContextRef,
    phrasePlaybackEventsRef,
    phrasePlaybackTotalPhrasesRef,
    getBenchmarkSnapshot,
  });

  return {
    adaptiveControllerRef,
    getAdaptiveController,
    historyServiceRef,
    phrasePlaybackEventsRef,
    phrasePlaybackTotalPhrasesRef,
    selectedBenchmarkInputMode,
    setSelectedBenchmarkInputMode,
    selectedBenchmarkLanguage,
    setSelectedBenchmarkLanguage,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
    recordAdaptiveBenchmark,
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    completeAdaptiveSessionFeedback,
    ensureLatestBrowserTtsDeDictationScriptFeedback,
    resetAdaptiveSessionFeedbackTracking,
  };
}
