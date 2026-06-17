import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  PhrasePlaybackEvent,
} from '../core/adaptive/types';
import type { AdaptiveSessionFeedbackByInputLanguage } from '../components/openrouter/types';
import type { ScopedAdaptiveControllerRegistry } from './adaptiveControllerRegistry';
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
