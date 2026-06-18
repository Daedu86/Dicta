import { LiveMetricsDiagnosticFallback } from './LiveMetricsDiagnosticFallback';
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
  insightsDiagnosticFallbackReport,
  lastSessionForLanguage,
  lastSessionScoreHelpText,
  languageTodaySummary,
  onChangeMetricsLanguageView,
  onChangeMetricsRangeView,
  onToggleInsightsCollapsed,
  onSelectInsightsDiagnosticFallbackReport,
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
            onChangeMetricsLanguageView={onChangeMetricsLanguageView}
            onToggleInsightsCollapsed={onToggleInsightsCollapsed}
          />
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
