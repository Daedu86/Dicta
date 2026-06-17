import { useCallback } from 'react';
import type { InputLanguageBenchmarkMetrics } from '../core/adaptive/types';
import { writeTextToClipboard } from './clipboardText';
import { formatInputModeLabel } from './sessionDisplayFormatters';
import { buildInsightsDiagnosticReportExport } from './adaptiveExportPackages';
import type { UseAdaptiveExportActionsOptions } from './useAdaptiveExportActionsTypes';

export type UseInsightsDiagnosticExportCallbacksOptions = Pick<
  UseAdaptiveExportActionsOptions,
  | 'sessions'
  | 'insightsDiagnosticProfile'
  | 'insightsDiagnosticFeedback'
  | 'insightsDiagnosticInputMode'
  | 'metricsLanguageView'
  | 'setInsightsDiagnosticFallbackReport'
  | 'setInsightsDiagnosticMessage'
> & {
  getBenchmarkActiveSessionStatus: (profile: InputLanguageBenchmarkMetrics) => string | undefined;
};

export function useInsightsDiagnosticExportCallbacks({
  sessions,
  insightsDiagnosticProfile,
  insightsDiagnosticFeedback,
  insightsDiagnosticInputMode,
  metricsLanguageView,
  setInsightsDiagnosticFallbackReport,
  setInsightsDiagnosticMessage,
  getBenchmarkActiveSessionStatus,
}: UseInsightsDiagnosticExportCallbacksOptions) {
  const selectInsightsDiagnosticFallbackReport = useCallback((): void => {
    const textarea = document.getElementById('insights-diagnostic-fallback-report') as HTMLTextAreaElement | null;
    if (!textarea) return;
    textarea.focus();
    textarea.select();
  }, []);

  const copyInsightsDiagnosticPackage = useCallback(async (): Promise<void> => {
    try {
      const report = buildInsightsDiagnosticReportExport({
        sessions,
        profile: insightsDiagnosticProfile,
        feedback: insightsDiagnosticFeedback,
        activeSessionStatus: getBenchmarkActiveSessionStatus(insightsDiagnosticProfile),
        insightsDiagnosticInputMode,
        metricsLanguageView,
      });
      const reportJson = JSON.stringify(report, null, 2);
      const copied = await writeTextToClipboard(reportJson);
      if (copied) {
        setInsightsDiagnosticFallbackReport('');
        setInsightsDiagnosticMessage(
          `Copied adaptive report for ${formatInputModeLabel(insightsDiagnosticInputMode)} / ${metricsLanguageView.toUpperCase()}.`,
        );
        return;
      }

      setInsightsDiagnosticFallbackReport(reportJson);
      setInsightsDiagnosticMessage('Clipboard access is blocked. Adaptive report generated below; select it and press Ctrl+C.');
      window.setTimeout(selectInsightsDiagnosticFallbackReport, 0);
    } catch (error) {
      console.error('Copy adaptive report failed.', error);
      const message = error instanceof Error ? error.message : String(error);
      setInsightsDiagnosticFallbackReport('');
      setInsightsDiagnosticMessage(`Could not prepare the adaptive report. ${message}`);
    }
  }, [
    getBenchmarkActiveSessionStatus,
    insightsDiagnosticFeedback,
    insightsDiagnosticInputMode,
    insightsDiagnosticProfile,
    metricsLanguageView,
    selectInsightsDiagnosticFallbackReport,
    sessions,
    setInsightsDiagnosticFallbackReport,
    setInsightsDiagnosticMessage,
  ]);

  return {
    copyInsightsDiagnosticPackage,
    selectInsightsDiagnosticFallbackReport,
  };
}
