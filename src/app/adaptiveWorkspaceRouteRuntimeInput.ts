import type { useAdaptiveWorkspaceRouteRuntime } from './useAdaptiveWorkspaceRouteRuntime';
import type { DictaAppRouteCompositionRuntimeParams } from './dictaAppRouteCompositionTypes';

type AdaptiveWorkspaceRouteRuntimeInput = Parameters<typeof useAdaptiveWorkspaceRouteRuntime>[0];

export function buildAdaptiveWorkspaceRouteRuntimeInput({
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  selectedBenchmarkInputMode,
  selectedBenchmarkLanguage,
  insightsDiagnosticInputMode,
  metricsLanguageView,
  sessions,
  activeSession,
  activeSessionFinished,
  sessionStatus,
  getActiveTypingLanguage,
  setBenchmarkExportMessage,
  setExportMessage,
  setSessionFeedbackMessage,
  setInsightsDiagnosticFallbackReport,
  setInsightsDiagnosticMessage,
}: DictaAppRouteCompositionRuntimeParams): AdaptiveWorkspaceRouteRuntimeInput {
  return {
    presentation: {
      adaptiveBenchmarksByInputLanguage,
      adaptiveSessionFeedbackByInputLanguage,
      selectedBenchmarkInputMode,
      selectedBenchmarkLanguage,
      insightsDiagnosticInputMode,
      metricsLanguageView,
    },
    exportActions: {
      sessions,
      activeSession,
      activeSessionFinished,
      sessionStatus,
      getActiveTypingLanguage,
      insightsDiagnosticInputMode,
      metricsLanguageView,
      setBenchmarkExportMessage,
      setExportMessage,
      setSessionFeedbackMessage,
      setInsightsDiagnosticFallbackReport,
      setInsightsDiagnosticMessage,
    },
  };
}
