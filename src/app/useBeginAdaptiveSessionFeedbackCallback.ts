import { useCallback } from 'react';
import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { InputMode, LanguageCode } from '../core/adaptive/types';
import { resetAdaptiveControllerForScope } from './adaptiveControllerRegistry';
import type { UseAdaptiveRuntimeFeedbackCallbacksOptions } from './adaptiveRuntimeFeedbackCallbackTypes';

export function useBeginAdaptiveSessionFeedbackCallback({
  activeSession,
  adaptiveControllersByInputLanguageRef,
  sessionFeedbackContextRef,
  sessionBenchmarkBeforeRef,
  phrasePlaybackEventsRef,
  phrasePlaybackTotalPhrasesRef,
  getBenchmarkSnapshot,
}: UseAdaptiveRuntimeFeedbackCallbacksOptions) {
  return useCallback(
    (inputMode: InputMode, language: LanguageCode, totalPhrases = 0): void => {
      if (!activeSession) return;
      const normalizedLanguage = normalizeBenchmarkLanguage(language);
      resetAdaptiveControllerForScope(adaptiveControllersByInputLanguageRef.current, inputMode, normalizedLanguage);
      sessionFeedbackContextRef.current[activeSession.id] = {
        inputMode,
        language: normalizedLanguage,
      };
      sessionBenchmarkBeforeRef.current[activeSession.id] = JSON.parse(
        JSON.stringify(getBenchmarkSnapshot(inputMode, normalizedLanguage)),
      );
      phrasePlaybackEventsRef.current = [];
      phrasePlaybackTotalPhrasesRef.current = totalPhrases;
    },
    [
      activeSession,
      adaptiveControllersByInputLanguageRef,
      getBenchmarkSnapshot,
      phrasePlaybackEventsRef,
      phrasePlaybackTotalPhrasesRef,
      sessionBenchmarkBeforeRef,
      sessionFeedbackContextRef,
    ],
  );
}
