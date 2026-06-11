import { useMemo, type ComponentProps } from 'react';
import type { LiveMetricsDock } from '../components/runtime-workspaces/LiveMetricsDock';

type LiveMetricsDockProps = ComponentProps<typeof LiveMetricsDock>;

type UseLiveMetricsDockPropsArgs = Omit<
  LiveMetricsDockProps,
  | 'hasTtsCurrentChunk'
  | 'onChangeMetricsLanguageView'
  | 'onChangeMetricsRangeView'
  | 'onChangeInsightsDiagnosticInputMode'
  | 'onCopyInsightsDiagnosticPackage'
  | 'onToggleInsightsCollapsed'
  | 'onSelectInsightsDiagnosticFallbackReport'
> & {
  ttsCurrentChunk: unknown;
  setMetricsLanguageView: LiveMetricsDockProps['onChangeMetricsLanguageView'];
  setMetricsRangeView: LiveMetricsDockProps['onChangeMetricsRangeView'];
  setInsightsDiagnosticInputMode: LiveMetricsDockProps['onChangeInsightsDiagnosticInputMode'];
  copyInsightsDiagnosticPackage: LiveMetricsDockProps['onCopyInsightsDiagnosticPackage'];
  setInsightsCollapsed: (updater: (value: boolean) => boolean) => void;
  selectInsightsDiagnosticFallbackReport: LiveMetricsDockProps['onSelectInsightsDiagnosticFallbackReport'];
};

export function useLiveMetricsDockProps({
  insightsCollapsed,
  metricsLanguageView,
  metricsRangeView,
  trend,
  insightsDiagnosticInputOptions,
  insightsDiagnosticInputMode,
  insightsDiagnosticMessage,
  insightsDiagnosticFallbackReport,
  workspaceMode,
  ttsCurrentChunk,
  ttsPacingMode,
  ttsStatus,
  lastSessionForLanguage,
  lastSessionScoreHelpText,
  languageTodaySummary,
  setMetricsLanguageView,
  setMetricsRangeView,
  setInsightsDiagnosticInputMode,
  copyInsightsDiagnosticPackage,
  setInsightsCollapsed,
  selectInsightsDiagnosticFallbackReport,
  formatInputModeLabel,
  formatSessionInputMode,
  formatDuration,
  formatSessionDate,
  formatTtsPacingMode,
}: UseLiveMetricsDockPropsArgs): LiveMetricsDockProps {
  return useMemo(
    () => ({
      insightsCollapsed,
      metricsLanguageView,
      metricsRangeView,
      trend,
      insightsDiagnosticInputOptions,
      insightsDiagnosticInputMode,
      insightsDiagnosticMessage,
      insightsDiagnosticFallbackReport,
      workspaceMode,
      hasTtsCurrentChunk: Boolean(ttsCurrentChunk),
      ttsPacingMode,
      ttsStatus,
      lastSessionForLanguage,
      lastSessionScoreHelpText,
      languageTodaySummary,
      onChangeMetricsLanguageView: setMetricsLanguageView,
      onChangeMetricsRangeView: setMetricsRangeView,
      onChangeInsightsDiagnosticInputMode: setInsightsDiagnosticInputMode,
      onCopyInsightsDiagnosticPackage: copyInsightsDiagnosticPackage,
      onToggleInsightsCollapsed: () => setInsightsCollapsed((value) => !value),
      onSelectInsightsDiagnosticFallbackReport: selectInsightsDiagnosticFallbackReport,
      formatInputModeLabel,
      formatSessionInputMode,
      formatDuration,
      formatSessionDate,
      formatTtsPacingMode,
    }),
    [
      insightsCollapsed,
      metricsLanguageView,
      metricsRangeView,
      trend,
      insightsDiagnosticInputOptions,
      insightsDiagnosticInputMode,
      insightsDiagnosticMessage,
      insightsDiagnosticFallbackReport,
      workspaceMode,
      ttsCurrentChunk,
      ttsPacingMode,
      ttsStatus,
      lastSessionForLanguage,
      lastSessionScoreHelpText,
      languageTodaySummary,
      setMetricsLanguageView,
      setMetricsRangeView,
      setInsightsDiagnosticInputMode,
      copyInsightsDiagnosticPackage,
      setInsightsCollapsed,
      selectInsightsDiagnosticFallbackReport,
      formatInputModeLabel,
      formatSessionInputMode,
      formatDuration,
      formatSessionDate,
      formatTtsPacingMode,
    ],
  );
}
