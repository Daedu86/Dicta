import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  hasAdaptiveSessionFeedbackForSession,
  upsertAdaptiveSessionFeedbackByInputLanguage,
} from '../core/adaptive/sessionFeedback';
import type {
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  PhrasePlaybackEvent,
} from '../core/adaptive/types';
import type { SemanticPhrase } from '../core/adaptive/SemanticPhrasePlanner';
import type { AdaptiveSessionFeedbackByInputLanguage } from '../components/openrouter/types';
import { resetAdaptiveControllerForScope, type ScopedAdaptiveControllerRegistry } from './adaptiveControllerRegistry';
import { appendAdaptivePhrasePlaybackEvent } from './adaptiveRuntimePhrasePlaybackEvents';
import {
  buildCompletedAdaptiveSessionFeedback,
  isBrowserTtsDeFeedbackScope,
  type CompleteAdaptiveSessionFeedbackOptions,
} from './adaptiveRuntimeSessionFeedbackCompletion';
import {
  findLatestFinishedBrowserTtsDeDictationScriptSession,
  mapRuntimeSessionInputMode,
  resolveRuntimeSessionLanguage,
} from './adaptiveRuntimeSessionUtils';
import type { AdaptiveRuntimeFeedbackContext } from './adaptiveRuntimeState';
import type { AdaptiveRuntimeSessionInput } from './adaptiveRuntimeTypes';

export type UseAdaptiveRuntimeFeedbackCallbacksOptions = {
  activeSession: AdaptiveRuntimeSessionInput | null;
  activeSessionId: string;
  adaptiveSessionFeedback: AdaptiveSessionFeedbackByInputLanguage;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<AdaptiveSessionFeedbackByInputLanguage>>;
  adaptiveSessionFeedbackRef: MutableRefObject<AdaptiveSessionFeedbackByInputLanguage>;
  persistAdaptiveSessionFeedbackNow: (feedback: AdaptiveSessionFeedbackByInputLanguage) => void;
  adaptiveControllersByInputLanguageRef: MutableRefObject<ScopedAdaptiveControllerRegistry>;
  sessionBenchmarkBeforeRef: MutableRefObject<Record<string, InputLanguageBenchmarkMetrics>>;
  sessionFeedbackContextRef: MutableRefObject<Record<string, AdaptiveRuntimeFeedbackContext>>;
  phrasePlaybackEventsRef: MutableRefObject<PhrasePlaybackEvent[]>;
  phrasePlaybackTotalPhrasesRef: MutableRefObject<number>;
  getBenchmarkSnapshot: (inputMode: InputMode, language: LanguageCode) => InputLanguageBenchmarkMetrics;
};

export function useAdaptiveRuntimeFeedbackCallbacks({
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
}: UseAdaptiveRuntimeFeedbackCallbacksOptions) {
  const beginAdaptiveSessionFeedback = useCallback(
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

  const recordPhrasePlaybackEvent = useCallback(
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

  const completeAdaptiveSessionFeedback = useCallback(
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

  const ensureLatestBrowserTtsDeDictationScriptFeedback = useCallback(
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

  const resetAdaptiveSessionFeedbackTracking = useCallback((sessionId?: string | null): void => {
    phrasePlaybackEventsRef.current = [];
    phrasePlaybackTotalPhrasesRef.current = 0;
    if (sessionId) {
      delete sessionFeedbackContextRef.current[sessionId];
    }
  }, [phrasePlaybackEventsRef, phrasePlaybackTotalPhrasesRef, sessionFeedbackContextRef]);

  return {
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    completeAdaptiveSessionFeedback,
    ensureLatestBrowserTtsDeDictationScriptFeedback,
    resetAdaptiveSessionFeedbackTracking,
  };
}
