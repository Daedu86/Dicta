import { formatDifficultyLabel } from '../../core/config';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../../core/languages';
import { rangeLabel } from '../../core/liveMetrics';
import { LiveMetric } from './LiveMetric';
import { LiveMetricsRangeTabs } from './LiveMetricsRangeTabs';
import type { LiveMetricsDockProps, RuntimeSessionInputMode } from './liveMetricsDockTypes';

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
          <div className="metrics-header bottom-metrics-header live-metrics-section live-metrics-section-header">
            <h2>Insights</h2>
            <div className="live-metrics-language-tabs" role="tablist" aria-label="Live metrics language">
              {SUPPORTED_LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`live-metrics-language-tab ${metricsLanguageView === code ? 'live-metrics-language-tab-active' : ''}`}
                  onClick={() => onChangeMetricsLanguageView(code)}
                  aria-pressed={metricsLanguageView === code}
                  title={`Live Metrics for ${LANGUAGE_LABELS[code]}`}
                >
                  {code.toUpperCase()}
                </button>
                ))}
            </div>
            <span className={`trend trend-${trend}`}>
              {trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Needs adjustment' : 'Stable'}
            </span>
            <div className="live-metrics-input-tabs" role="tablist" aria-label="Adaptive report input">
              {insightsDiagnosticInputOptions.map((option) => (
                <button
                  key={option.inputMode}
                  type="button"
                  className={`live-metrics-input-tab ${insightsDiagnosticInputMode === option.inputMode ? 'live-metrics-input-tab-active' : ''}`}
                  onClick={() => onChangeInsightsDiagnosticInputMode(option.inputMode)}
                  aria-pressed={insightsDiagnosticInputMode === option.inputMode}
                  title={`${formatInputModeLabel(option.inputMode)} report`}
                >
                  <span>{option.label}</span>
                  <small>{formatInputModeLabel(option.inputMode)}</small>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="secondary-button live-metrics-report-button"
              onClick={() => void onCopyInsightsDiagnosticPackage()}
              title={`Copy one structured adaptive report for ${formatInputModeLabel(insightsDiagnosticInputMode)} / ${metricsLanguageView.toUpperCase()}: summary, loop breakdown, planner/controller/runtime diagnostics, Browser TTS metadata, benchmark, feedback, and compact raw debug.`}
            >
              Copy adaptive report
            </button>
            <button
              type="button"
              className="secondary-button live-metrics-collapse-button"
              onClick={onToggleInsightsCollapsed}
              aria-expanded={!insightsCollapsed}
              aria-label={insightsCollapsed ? 'Expand insights panel' : 'Minimize insights panel'}
              title={insightsCollapsed ? 'Expand' : 'Minimize'}
            >
              <span
                className={`live-metrics-collapse-icon ${insightsCollapsed ? 'live-metrics-collapse-icon-collapsed' : ''}`}
                aria-hidden="true"
              >
                ⌃
              </span>
            </button>
          </div>
          {insightsDiagnosticMessage ? (
            <p className={`insights-diagnostic-message ${insightsDiagnosticMessage.toLowerCase().includes('could not') ? 'error' : 'success'}`}>
              {insightsDiagnosticMessage}
            </p>
          ) : null}
          {insightsDiagnosticFallbackReport ? (
            <div className="insights-report-fallback">
              <div className="insights-report-fallback-header">
                <strong>Adaptive report ready</strong>
                <button type="button" className="secondary-button" onClick={onSelectInsightsDiagnosticFallbackReport}>
                  Select report
                </button>
              </div>
              <textarea
                id="insights-diagnostic-fallback-report"
                readOnly
                value={insightsDiagnosticFallbackReport}
                rows={8}
                aria-label="Generated adaptive user and system report"
              />
            </div>
          ) : null}
          {!insightsCollapsed && workspaceMode === 'tts' ? (
            <div className="bottom-metrics-player tts-bottom-player live-metrics-section live-metrics-section-player">
              <span className="bottom-metrics-player-label">Browser TTS</span>
              <span>{playerStatus}</span>
            </div>
          ) : null}
        </div>

        {!insightsCollapsed ? (
          <>
            <section className="bottom-summary-section live-metrics-section live-metrics-section-last">
              <div className="bottom-summary-header">
                <h3>Last Session ({metricsLanguageView.toUpperCase()})</h3>
              </div>
              {!lastSessionForLanguage ? <p className="hint">No sessions found for this language yet.</p> : null}
              <div className="bottom-summary-grid">
                <LiveMetric label="Name" value={lastSessionForLanguage?.name ?? '—'} />
                <LiveMetric label="Input mode" value={lastSessionForLanguage ? formatSessionInputMode(lastSessionForLanguage.inputMode as RuntimeSessionInputMode) : '—'} />
                <LiveMetric label="Difficulty" value={lastSessionForLanguage?.difficulty ? formatDifficultyLabel(lastSessionForLanguage.difficulty) : '—'} />
                <LiveMetric
                  label="Score"
                  value={lastSessionForLanguage ? String(lastSessionForLanguage.metrics.score) : '—'}
                  title={lastSessionScoreHelpText}
                />
                <LiveMetric label="Accuracy" value={lastSessionForLanguage ? `${lastSessionForLanguage.metrics.accuracy.toFixed(1)}%` : '—'} />
                <LiveMetric
                  label="Duration"
                  value={
                    typeof lastSessionForLanguage?.voiceDurationSec === 'number'
                      ? formatDuration(lastSessionForLanguage.voiceDurationSec)
                      : '—'
                  }
                />
                <LiveMetric label="Updated" value={lastSessionForLanguage ? formatSessionDate(lastSessionForLanguage.updatedAt) : '—'} />
              </div>
            </section>

            <section className="bottom-summary-section today-summary-section live-metrics-section live-metrics-section-period">
              <div className="bottom-summary-header">
                <h3>{rangeLabel(metricsRangeView)} ({metricsLanguageView.toUpperCase()})</h3>
                <LiveMetricsRangeTabs
                  metricsRangeView={metricsRangeView}
                  onChangeMetricsRangeView={onChangeMetricsRangeView}
                />
              </div>
              {languageTodaySummary.sessionsInRange.length === 0 ? <p className="hint">No sessions in this period for this language.</p> : null}
              <div className="today-summary-grid">
                <LiveMetric label="Sessions" value={String(languageTodaySummary.sessionsInRange.length)} />
                <LiveMetric label="Duration" value={formatDuration(languageTodaySummary.durationSeconds)} />
                <LiveMetric label="Avg points" value={languageTodaySummary.avgPoints !== null ? languageTodaySummary.avgPoints.toFixed(1) : '—'} />
                <LiveMetric label="Avg score" value={languageTodaySummary.avgScore !== null ? languageTodaySummary.avgScore.toFixed(1) : '—'} />
                <LiveMetric label="Avg accuracy" value={languageTodaySummary.avgAccuracy !== null ? `${languageTodaySummary.avgAccuracy.toFixed(1)}%` : '—'} />
                <LiveMetric label="Avg WPM" value={languageTodaySummary.avgWpm !== null ? languageTodaySummary.avgWpm.toFixed(1) : '—'} />
              </div>
              <div className="today-chart-row">
                {languageTodaySummary.days.map((item) => (
                  <div key={item.label} className="today-chart-bar">
                    <span className="today-chart-label">{item.label}</span>
                    <div className="today-chart-track">
                      <div
                        className="today-chart-fill"
                        style={{ width: `${Math.round((item.count / languageTodaySummary.maxDayCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}
