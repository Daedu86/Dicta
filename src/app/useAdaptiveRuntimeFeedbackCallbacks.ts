import type { UseAdaptiveRuntimeFeedbackCallbacksOptions } from './adaptiveRuntimeFeedbackCallbackTypes';
import { useBeginAdaptiveSessionFeedbackCallback } from './useBeginAdaptiveSessionFeedbackCallback';
import { useCompleteAdaptiveSessionFeedbackCallback } from './useCompleteAdaptiveSessionFeedbackCallback';
import { useEnsureLatestBrowserTtsDeDictationScriptFeedbackCallback } from './useEnsureLatestBrowserTtsDeDictationScriptFeedbackCallback';
import { useRecordAdaptivePhrasePlaybackEventCallback } from './useRecordAdaptivePhrasePlaybackEventCallback';
import { useResetAdaptiveSessionFeedbackTrackingCallback } from './useResetAdaptiveSessionFeedbackTrackingCallback';

export type { UseAdaptiveRuntimeFeedbackCallbacksOptions } from './adaptiveRuntimeFeedbackCallbackTypes';

export function useAdaptiveRuntimeFeedbackCallbacks(options: UseAdaptiveRuntimeFeedbackCallbacksOptions) {
  const beginAdaptiveSessionFeedback = useBeginAdaptiveSessionFeedbackCallback(options);
  const recordPhrasePlaybackEvent = useRecordAdaptivePhrasePlaybackEventCallback(options);
  const completeAdaptiveSessionFeedback = useCompleteAdaptiveSessionFeedbackCallback(options);
  const ensureLatestBrowserTtsDeDictationScriptFeedback = useEnsureLatestBrowserTtsDeDictationScriptFeedbackCallback(
    options,
    completeAdaptiveSessionFeedback,
  );
  const resetAdaptiveSessionFeedbackTracking = useResetAdaptiveSessionFeedbackTrackingCallback(options);

  return {
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    completeAdaptiveSessionFeedback,
    ensureLatestBrowserTtsDeDictationScriptFeedback,
    resetAdaptiveSessionFeedbackTracking,
  };
}
