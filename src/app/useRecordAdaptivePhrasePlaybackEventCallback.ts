import { useCallback } from 'react';
import type { InputMode, LanguageCode, PhrasePlaybackEvent } from '../core/adaptive/types';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import { appendAdaptivePhrasePlaybackEvent } from './adaptiveRuntimePhrasePlaybackEvents';
import type { UseAdaptiveRuntimeFeedbackCallbacksOptions } from './adaptiveRuntimeFeedbackCallbackTypes';

export function useRecordAdaptivePhrasePlaybackEventCallback({
  activeSession,
  phrasePlaybackEventsRef,
}: UseAdaptiveRuntimeFeedbackCallbacksOptions) {
  return useCallback(
    (
      event: PhrasePlaybackEvent['event'],
      inputMode: InputMode,
      language: LanguageCode,
      phrase: SemanticPhrase | null | undefined,
      phraseIndex: number,
    ): void => {
      if (!activeSession || phraseIndex < 0) return;
      phrasePlaybackEventsRef.current = appendAdaptivePhrasePlaybackEvent({
        currentEvents: phrasePlaybackEventsRef.current,
        sessionId: activeSession.id,
        event,
        inputMode,
        language,
        phrase,
        phraseIndex,
      });
    },
    [activeSession, phrasePlaybackEventsRef],
  );
}
