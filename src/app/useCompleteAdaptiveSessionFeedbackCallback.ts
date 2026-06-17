import { useCallback } from 'react';
import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  hasAdaptiveSessionFeedbackForSession,
  upsertAdaptiveSessionFeedbackByInputLanguage,
} from '../core/adaptive/sessionFeedback';
import {
  buildCompletedAdaptiveSessionFeedback,
  isBrowserTtsDeFeedbackScope,
  type CompleteAdaptiveSessionFeedbackOptions,
} from './adaptiveRuntimeSessionFeedbackCompletion';
import {
  mapRuntimeSessionInputMode,
  resolveRuntimeSessionLanguage,
} from './adaptiveRuntimeSessionUtils';
import type { UseAdaptiveRuntimeFeedbackCallbacksOptions } from './adaptiveRuntimeFeedbackCallbackTypes';

export function useCompleteAdaptiveSessionFeedbackCallback({
  activeSession,
  adaptiveSessionFeedbackRef,
  setAdaptiveSessionFeedback,
  persistAdaptiveSessionFeedbackNow,
  sessionBenchmarkBeforeRef,
  sessionFeedbackContextRef,
  phrasePlaybackEventsRef,
  phrasePlaybackTotalPhrasesRef,
  getBenchmarkSnapshot,
}: UseAdaptiveRuntimeFeedbackCallbacksOptions) {
  return useCallback(
    (
      completedSession = activeSession,
      options: CompleteAdaptiveSessionFeedbackOptions = {},
    ): void => {
      if (!completedSession) return;
      const context = sessionFeedbackContextRef.current[completedSession.id];
      const inputMode = context?.inputMode ?? mapRuntimeSessionInputMode(completedSession.inputMode);
      const language = normalizeBenchmarkLanguage(context?.language ?? resolveRuntimeSessionLanguage(completedSession));
      if (
        isBrowserTtsDeFeedbackScope(inputMode, language) &&
        hasAdaptiveSessionFeedbackForSession(
          adaptiveSessionFeedbackRef.current[inputMode]?.[language],
          inputMode,
          language,
          completedSession.id,
        )
      ) {
        delete sessionBenchmarkBeforeRef.current[completedSession.id];
        delete sessionFeedbackContextRef.current[completedSession.id];
        return;
      }
      const before = sessionBenchmarkBeforeRef.current[completedSession.id] ?? getBenchmarkSnapshot(inputMode, language);
      const after = getBenchmarkSnapshot(inputMode, language);
      const feedback = buildCompletedAdaptiveSessionFeedback({
        completedSession,
        inputMode,
        language,
        benchmarkBefore: before,
        benchmarkAfter: after,
        phraseEvents: options.phraseEvents ?? phrasePlaybackEventsRef.current,
        totalPhrases: options.totalPhrases ?? (phrasePlaybackTotalPhrasesRef.current || undefined),
      });
      const nextFeedbackState = upsertAdaptiveSessionFeedbackByInputLanguage(
        adaptiveSessionFeedbackRef.current,
        inputMode,
        language,
        feedback,
      );
      adaptiveSessionFeedbackRef.current = nextFeedbackState;
      setAdaptiveSessionFeedback(nextFeedbackState);
      persistAdaptiveSessionFeedbackNow(nextFeedbackState);
      delete sessionBenchmarkBeforeRef.current[completedSession.id];
      delete sessionFeedbackContextRef.current[completedSession.id];
    },
    [
      activeSession,
      adaptiveSessionFeedbackRef,
      getBenchmarkSnapshot,
      persistAdaptiveSessionFeedbackNow,
      phrasePlaybackEventsRef,
      phrasePlaybackTotalPhrasesRef,
      sessionBenchmarkBeforeRef,
      sessionFeedbackContextRef,
      setAdaptiveSessionFeedback,
    ],
  );
}
