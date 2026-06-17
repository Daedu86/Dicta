import { useRef, useState } from 'react';
import { AdaptiveDictationController } from '../core/adaptive/AdaptiveDictationController';
import type {
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
  PhrasePlaybackEvent,
} from '../core/adaptive/types';
import { HistoricalPerformanceService } from '../core/history/HistoricalPerformanceService';
import type { ScopedAdaptiveControllerRegistry } from './adaptiveControllerRegistry';

export type AdaptiveRuntimeFeedbackContext = {
  inputMode: InputMode;
  language: LanguageCode;
};

export function useAdaptiveRuntimeState() {
  const adaptiveControllerRef = useRef(new AdaptiveDictationController());
  const adaptiveControllersByInputLanguageRef = useRef<ScopedAdaptiveControllerRegistry>({});
  const historyServiceRef = useRef(new HistoricalPerformanceService());
  const adaptiveBenchmarkLastUpdateRef = useRef<Record<string, number>>({});
  const sessionBenchmarkBeforeRef = useRef<Record<string, InputLanguageBenchmarkMetrics>>({});
  const sessionFeedbackContextRef = useRef<Record<string, AdaptiveRuntimeFeedbackContext>>({});
  const phrasePlaybackEventsRef = useRef<PhrasePlaybackEvent[]>([]);
  const phrasePlaybackTotalPhrasesRef = useRef(0);
  const [selectedBenchmarkInputMode, setSelectedBenchmarkInputMode] = useState<InputMode>('browser-tts');

  return {
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
  };
}
