import { useLiveMetricsDockProps } from './useLiveMetricsDockProps';
import {
  formatInputModeLabel,
  formatSessionInputMode,
} from './sessionDisplayFormatters';
import { formatSessionDate } from './sessionDateFormatters';
import { formatDuration } from './sessionPlaybackDuration';

type LiveMetricsDockPropsArgs = Parameters<typeof useLiveMetricsDockProps>[0];

type UseLiveMetricsDockRuntimeArgs = {
  insightsCollapsed: LiveMetricsDockPropsArgs['insightsCollapsed'];
  metricsLanguageView: LiveMetricsDockPropsArgs['metricsLanguageView'];
  metricsRangeView: LiveMetricsDockPropsArgs['metricsRangeView'];
  trend: LiveMetricsDockPropsArgs['trend'];
  insightsDiagnosticInputOptions: LiveMetricsDockPropsArgs['insightsDiagnosticInputOptions'];
  insightsDiagnosticInputMode: LiveMetricsDockPropsArgs['insightsDiagnosticInputMode'];
  insightsDiagnosticMessage: LiveMetricsDockPropsArgs['insightsDiagnosticMessage'];
  insightsDiagnosticFallbackReport: LiveMetricsDockPropsArgs['insightsDiagnosticFallbackReport'];
  lastSessionForLanguage: LiveMetricsDockPropsArgs['lastSessionForLanguage'];
  lastSessionScoreHelpText: LiveMetricsDockPropsArgs['lastSessionScoreHelpText'];
  languageTodaySummary: LiveMetricsDockPropsArgs['languageTodaySummary'];
  setMetricsLanguageView: LiveMetricsDockPropsArgs['setMetricsLanguageView'];
  setMetricsRangeView: LiveMetricsDockPropsArgs['setMetricsRangeView'];
  setInsightsDiagnosticInputMode: LiveMetricsDockPropsArgs['setInsightsDiagnosticInputMode'];
  copyInsightsDiagnosticPackage: LiveMetricsDockPropsArgs['copyInsightsDiagnosticPackage'];
  setInsightsCollapsed: LiveMetricsDockPropsArgs['setInsightsCollapsed'];
  selectInsightsDiagnosticFallbackReport: LiveMetricsDockPropsArgs['selectInsightsDiagnosticFallbackReport'];
};

export function useLiveMetricsDockRuntime({
  insightsCollapsed,
  metricsLanguageView,
  metricsRangeView,
  trend,
  insightsDiagnosticInputOptions,
  insightsDiagnosticInputMode,
  insightsDiagnosticMessage,
  insightsDiagnosticFallbackReport,
  lastSessionForLanguage,
  lastSessionScoreHelpText,
  languageTodaySummary,
  setMetricsLanguageView,
  setMetricsRangeView,
  setInsightsDiagnosticInputMode,
  copyInsightsDiagnosticPackage,
  setInsightsCollapsed,
  selectInsightsDiagnosticFallbackReport,
}: UseLiveMetricsDockRuntimeArgs) {
  const liveMetricsDockProps = useLiveMetricsDockProps({
    insightsCollapsed,
    metricsLanguageView,
    metricsRangeView,
    trend,
    insightsDiagnosticInputOptions,
    insightsDiagnosticInputMode,
    insightsDiagnosticMessage,
    insightsDiagnosticFallbackReport,
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
  });

  return {
    liveMetricsDockProps,
  };
}
