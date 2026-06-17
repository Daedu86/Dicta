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
  insightsDiagnosticInputOptions,
  insightsDiagnosticInputMode,
  insightsDiagnosticMessage,
  insightsDiagnosticFallbackReport,
  workspaceMode,
  hasTtsCurrentChunk,
  ttsPacingMode,
  ttsStatus,
  lastSessionForLanguage,
  lastSessionScoreHelpText,
  languageTodaySummary,
  onChangeMetricsLanguageView,
  onChangeMetricsRangeView,
  onChangeInsightsDiagnosticInputMode,
  onCopyInsightsDiagnosticPackage,
  onToggleInsightsCollapsed,
  onSelectInsightsDiagnosticFallbackReport,
  formatInputModeLabel,
  formatSessionInputMode,
  formatDuration,
  formatSessionDate,
  formatTtsPacingMode,
}: LiveMetricsDockProps) {
  const playerStatus = hasTtsCurrentChunk ? formatTtsPacingMode(ttsPacingMode) : ttsStatus;

  return (
    <section className="bottom-metrics-dock">
      <div className="bottom-metrics-inner">
        <div className={`bottom-metrics-top ${insightsCollapsed ? 'bottom-metrics-top-collapsed' : ''}`}>
          <LiveMetricsDockHeader
            insightsCollapsed={insightsCollapsed}
            metricsLanguageView={metricsLanguageView}
            trend={trend}
            insightsDiagnosticInputOptions={insightsDiagnosticInputOptions}
            insightsDiagnosticInputMode={insightsDiagnosticInputMode}
            onChangeMetricsLanguageView={onChangeMetricsLanguageView}
            onChangeInsightsDiagnosticInputMode={onChangeInsightsDiagnosticInputMode}
            onCopyInsightsDiagnosticPackage={onCopyInsightsDiagnosticPackage}
            onToggleInsightsCollapsed={onToggleInsightsCollapsed}
            formatInputModeLabel={formatInputModeLabel}
          />
          <LiveMetricsDiagnosticMessage message={insightsDiagnosticMessage} />
          <LiveMetricsDiagnosticFallback
            report={insightsDiagnosticFallbackReport}
            onSelectReport={onSelectInsightsDiagnosticFallbackReport}
          />
          {!insightsCollapsed && workspaceMode === 'tts' ? (
            <div className="bottom-metrics-player tts-bottom-player live-metrics-section live-metrics-section-player">
              <span className="bottom-metrics-player-label">Browser TTS</span>
              <span>{playerStatus}</span>
            </div>
          ) : null}
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
