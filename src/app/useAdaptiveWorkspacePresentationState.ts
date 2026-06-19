import { useMemo } from 'react';
import type { InputMode } from '../core/adaptive/types';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import {
  buildAdaptiveWorkspacePresentationState,
} from './adaptiveWorkspacePresentation';

type AdaptiveWorkspacePresentationStateOptions = {
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  selectedBenchmarkInputMode: InputMode;
  selectedBenchmarkLanguage: BenchmarkLanguageButton;
  insightsDiagnosticInputMode: InputMode;
  metricsLanguageView: BenchmarkLanguageButton;
};

export function useAdaptiveWorkspacePresentationState({
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  selectedBenchmarkInputMode,
  selectedBenchmarkLanguage,
  insightsDiagnosticInputMode,
  metricsLanguageView,
}: AdaptiveWorkspacePresentationStateOptions) {
  return useMemo(
    () =>
      buildAdaptiveWorkspacePresentationState({
        adaptiveBenchmarksByInputLanguage,
        adaptiveSessionFeedbackByInputLanguage,
        selectedBenchmarkInputMode,
        selectedBenchmarkLanguage,
        insightsDiagnosticInputMode,
        metricsLanguageView,
      }),
    [
      adaptiveBenchmarksByInputLanguage,
      adaptiveSessionFeedbackByInputLanguage,
      selectedBenchmarkInputMode,
      selectedBenchmarkLanguage,
      insightsDiagnosticInputMode,
      metricsLanguageView,
    ],
  );
}
