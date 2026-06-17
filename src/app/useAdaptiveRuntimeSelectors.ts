import { useCallback, type MutableRefObject } from 'react';
import { AdaptiveDictationController } from '../core/adaptive/AdaptiveDictationController';
import { createEmptyInputLanguageBenchmark } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { InputLanguageBenchmarkMetrics, InputMode, LanguageCode } from '../core/adaptive/types';
import { HistoricalPerformanceService } from '../core/history/HistoricalPerformanceService';
import type { AdaptiveBenchmarksByInputLanguage } from '../components/openrouter/types';
import {
  getAdaptiveControllerForScope,
  type ScopedAdaptiveControllerRegistry,
} from './adaptiveControllerRegistry';
import { buildHistoricalPerformanceProfile } from './adaptiveRuntimeSessionUtils';
import type { AdaptiveRuntimeSessionInput } from './adaptiveRuntimeTypes';

export type UseAdaptiveRuntimeSelectorsOptions = {
  sessions: AdaptiveRuntimeSessionInput[];
  adaptiveControllersByInputLanguageRef: MutableRefObject<ScopedAdaptiveControllerRegistry>;
  adaptiveBenchmarksRef: MutableRefObject<AdaptiveBenchmarksByInputLanguage>;
  historyServiceRef: MutableRefObject<HistoricalPerformanceService>;
};

export function useAdaptiveRuntimeSelectors({
  sessions,
  adaptiveControllersByInputLanguageRef,
  adaptiveBenchmarksRef,
  historyServiceRef,
}: UseAdaptiveRuntimeSelectorsOptions) {
  const getAdaptiveController = useCallback(
    (inputMode: InputMode, language: LanguageCode): AdaptiveDictationController =>
      getAdaptiveControllerForScope(adaptiveControllersByInputLanguageRef.current, inputMode, language),
    [adaptiveControllersByInputLanguageRef],
  );

  const getHistoricalPerformanceProfile = useCallback(
    (inputMode: InputMode, language?: string) =>
      buildHistoricalPerformanceProfile(sessions, historyServiceRef.current, inputMode, language),
    [historyServiceRef, sessions],
  );

  const getBenchmarkSnapshot = useCallback(
    (inputMode: InputMode, language: LanguageCode): InputLanguageBenchmarkMetrics =>
      adaptiveBenchmarksRef.current[inputMode]?.[language] ?? createEmptyInputLanguageBenchmark(inputMode, language),
    [adaptiveBenchmarksRef],
  );

  return {
    getAdaptiveController,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
  };
}
