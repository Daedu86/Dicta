import { LiveMetricsDiagnosticFallback, LiveMetricsDiagnosticMessage } from './LiveMetricsDiagnosticFallback';
import { LiveMetricsDockHeader } from './LiveMetricsDockHeader';
import { LiveMetricsLastSessionSummary } from './LiveMetricsLastSessionSummary';
import { LiveMetricsPeriodSummary } from './LiveMetricsPeriodSummary';
import type { LiveMetricsDockProps } from './liveMetricsDockTypes';

export type { LiveMetricsDockProps } from './liveMetricsDockTypes';

export function LiveMetricsDock({
  insightsCollapsed,
  metricsLanguageView,
  metricsRangeView,
  trend,
  insightsDiagnosticInputMode,
  insightsDiagnosticMessage,
  insightsDiagnosticFallbackReport,
  lastSessionForLanguage,
  lastSessionScoreHelpText,
  languageTodaySummary,
  onChangeMetricsLanguageView,
  onChangeMetricsRangeView,
  onCopyInsightsDiagnosticPackage,
  onToggleInsightsCollapsed,
  onSelectInsightsDiagnosticFallbackReport,
  formatInputModeLabel,
  formatSessionInputMode,
  formatDuration,
  formatSessionDate,
}: LiveMetricsDockProps) {
  return (
    <section className="bottom-metrics-dock">
      <div className="bottom-metrics-inner">
        <div className={`bottom-metrics-top ${insightsCollapsed ? 'bottom-metrics-top-collapsed' : ''}`}>
          <LiveMetricsDockHeader
            insightsCollapsed={insightsCollapsed}
            metricsLanguageView={metricsLanguageView}
            trend={trend}
            insightsDiagnosticInputMode={insightsDiagnosticInputMode}
            onChangeMetricsLanguageView={onChangeMetricsLanguageView}
            onCopyInsightsDiagnosticPackage={onCopyInsightsDiagnosticPackage}
            onToggleInsightsCollapsed={onToggleInsightsCollapsed}
            formatInputModeLabel={formatInputModeLabel}
          />
          <LiveMetricsDiagnosticMessage message={insightsDiagnosticMessage} />
          <LiveMetricsDiagnosticFallback
            report={insightsDiagnosticFallbackReport}
            onSelectReport={onSelectInsightsDiagnosticFallbackReport}
          />
        </div>

        {!insightsCollapsed ? (
          <>
            <LiveMetricsLastSessionSummary
              metricsLanguageView={metricsLanguageView}
              lastSessionForLanguage={lastSessionForLanguage}
              lastSessionScoreHelpText={lastSessionScoreHelpText}
              formatSessionInputMode={formatSessionInputMode}
              formatDuration={formatDuration}
              formatSessionDate={formatSessionDate}
            />
            <LiveMetricsPeriodSummary
              metricsLanguageView={metricsLanguageView}
              metricsRangeView={metricsRangeView}
              languageTodaySummary={languageTodaySummary}
              onChangeMetricsRangeView={onChangeMetricsRangeView}
              formatDuration={formatDuration}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
