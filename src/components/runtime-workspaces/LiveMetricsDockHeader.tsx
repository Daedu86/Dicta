import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../../core/languages';
import type { LiveMetricsDockProps } from './liveMetricsDockTypes';

type LiveMetricsDockHeaderProps = Pick<
  LiveMetricsDockProps,
  | 'insightsCollapsed'
  | 'metricsLanguageView'
  | 'trend'
  | 'insightsDiagnosticInputMode'
  | 'onChangeMetricsLanguageView'
  | 'onCopyInsightsDiagnosticPackage'
  | 'onToggleInsightsCollapsed'
  | 'formatInputModeLabel'
>;

function formatTrendLabel(trend: LiveMetricsDockProps['trend']): string {
  if (trend === 'improving') return 'Improving';
  if (trend === 'declining') return 'Needs adjustment';
  return 'Stable';
}

export function LiveMetricsDockHeader({
  insightsCollapsed,
  metricsLanguageView,
  trend,
  insightsDiagnosticInputMode,
  onChangeMetricsLanguageView,
  onCopyInsightsDiagnosticPackage,
  onToggleInsightsCollapsed,
  formatInputModeLabel,
}: LiveMetricsDockHeaderProps) {
  return (
    <div className="metrics-header bottom-metrics-header live-metrics-section live-metrics-section-header">
      <div className="live-metrics-heading-row">
        <div className="live-metrics-title-group">
          <h2>Insights</h2>
          <span className={`trend trend-${trend}`}>{formatTrendLabel(trend)}</span>
        </div>
        <div className="live-metrics-language-tabs" role="group" aria-label="Live metrics language">
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
        <div className="live-metrics-action-group">
          <button
            type="button"
            className="secondary-button live-metrics-report-button"
            onClick={() => void onCopyInsightsDiagnosticPackage()}
            title={`Copy one structured adaptive report for ${formatInputModeLabel(insightsDiagnosticInputMode)} / ${metricsLanguageView.toUpperCase()}: summary, loop breakdown, planner/controller/runtime diagnostics, Browser TTS metadata, benchmark, feedback, and compact raw debug.`}
          >
            Copy full adaptive report
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
      </div>
    </div>
  );
}
