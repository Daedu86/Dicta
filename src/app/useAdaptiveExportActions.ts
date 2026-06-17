import { useAdaptiveBenchmarkExportCallbacks } from './useAdaptiveBenchmarkExportCallbacks';
import { useAdaptiveFeedbackExportCallbacks } from './useAdaptiveFeedbackExportCallbacks';
import { useInsightsDiagnosticExportCallbacks } from './useInsightsDiagnosticExportCallbacks';
import type { UseAdaptiveExportActionsOptions } from './useAdaptiveExportActionsTypes';

export type { UseAdaptiveExportActionsOptions } from './useAdaptiveExportActionsTypes';

export function useAdaptiveExportActions(options: UseAdaptiveExportActionsOptions) {
  const benchmarkExportActions = useAdaptiveBenchmarkExportCallbacks({
    activeSession: options.activeSession,
    activeSessionFinished: options.activeSessionFinished,
    sessionStatus: options.sessionStatus,
    getActiveTypingLanguage: options.getActiveTypingLanguage,
    setBenchmarkExportMessage: options.setBenchmarkExportMessage,
    setExportMessage: options.setExportMessage,
  });

  const feedbackExportActions = useAdaptiveFeedbackExportCallbacks({
    sessions: options.sessions,
    setSessionFeedbackMessage: options.setSessionFeedbackMessage,
    getBenchmarkActiveSessionStatus: benchmarkExportActions.getBenchmarkActiveSessionStatus,
  });

  const insightsDiagnosticActions = useInsightsDiagnosticExportCallbacks({
    sessions: options.sessions,
    insightsDiagnosticProfile: options.insightsDiagnosticProfile,
    insightsDiagnosticFeedback: options.insightsDiagnosticFeedback,
    insightsDiagnosticInputMode: options.insightsDiagnosticInputMode,
    metricsLanguageView: options.metricsLanguageView,
    setInsightsDiagnosticFallbackReport: options.setInsightsDiagnosticFallbackReport,
    setInsightsDiagnosticMessage: options.setInsightsDiagnosticMessage,
    getBenchmarkActiveSessionStatus: benchmarkExportActions.getBenchmarkActiveSessionStatus,
  });

  return {
    ...benchmarkExportActions,
    ...feedbackExportActions,
    ...insightsDiagnosticActions,
  };
}
