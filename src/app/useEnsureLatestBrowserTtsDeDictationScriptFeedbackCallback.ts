import { useCallback } from 'react';
import type { InputMode, LanguageCode } from '../core/adaptive/types';
import { hasAdaptiveSessionFeedbackForSession } from '../core/adaptive/sessionFeedback';
import { findLatestFinishedBrowserTtsDeDictationScriptSession } from './adaptiveRuntimeSessionUtils';
import type { UseAdaptiveRuntimeFeedbackCallbacksOptions } from './adaptiveRuntimeFeedbackCallbackTypes';
import type { AdaptiveRuntimeSessionInput } from './adaptiveRuntimeTypes';
import type { useCompleteAdaptiveSessionFeedbackCallback } from './useCompleteAdaptiveSessionFeedbackCallback';

export function useEnsureLatestBrowserTtsDeDictationScriptFeedbackCallback(
  {
    activeSessionId,
    adaptiveSessionFeedback,
    adaptiveSessionFeedbackRef,
    phrasePlaybackEventsRef,
    phrasePlaybackTotalPhrasesRef,
  }: UseAdaptiveRuntimeFeedbackCallbacksOptions,
  completeAdaptiveSessionFeedback: ReturnType<typeof useCompleteAdaptiveSessionFeedbackCallback>,
) {
  return useCallback(
    (sourceSessions: AdaptiveRuntimeSessionInput[]): void => {
      const latestSession = findLatestFinishedBrowserTtsDeDictationScriptSession(sourceSessions);
      if (!latestSession) return;
      const inputMode: InputMode = 'browser-tts';
      const language: LanguageCode = 'de';
      if (
        hasAdaptiveSessionFeedbackForSession(
          adaptiveSessionFeedbackRef.current[inputMode]?.[language],
          inputMode,
          language,
          latestSession.id,
        )
      ) {
        return;
      }
      completeAdaptiveSessionFeedback(latestSession, {
        phraseEvents: activeSessionId === latestSession.id ? phrasePlaybackEventsRef.current : [],
        totalPhrases:
          activeSessionId === latestSession.id && phrasePlaybackTotalPhrasesRef.current > 0
            ? phrasePlaybackTotalPhrasesRef.current
            : latestSession.dictationScript?.phrases?.length,
      });
    },
    [
      activeSessionId,
      adaptiveSessionFeedback,
      adaptiveSessionFeedbackRef,
      completeAdaptiveSessionFeedback,
      phrasePlaybackEventsRef,
      phrasePlaybackTotalPhrasesRef,
    ],
  );
}
