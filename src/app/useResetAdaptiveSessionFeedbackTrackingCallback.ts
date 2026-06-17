import { useCallback } from 'react';
import type { UseAdaptiveRuntimeFeedbackCallbacksOptions } from './adaptiveRuntimeFeedbackCallbackTypes';

export function useResetAdaptiveSessionFeedbackTrackingCallback({
  phrasePlaybackEventsRef,
  phrasePlaybackTotalPhrasesRef,
  sessionFeedbackContextRef,
}: UseAdaptiveRuntimeFeedbackCallbacksOptions) {
  return useCallback((sessionId?: string | null): void => {
    phrasePlaybackEventsRef.current = [];
    phrasePlaybackTotalPhrasesRef.current = 0;
    if (sessionId) {
      delete sessionFeedbackContextRef.current[sessionId];
    }
  }, [phrasePlaybackEventsRef, phrasePlaybackTotalPhrasesRef, sessionFeedbackContextRef]);
}
