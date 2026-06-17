import { rangeLabel } from '../../core/liveMetrics';
import { LiveMetric } from './LiveMetric';
import { LiveMetricsRangeTabs } from './LiveMetricsRangeTabs';
import type { LiveMetricsDockProps } from './liveMetricsDockTypes';

type LiveMetricsPeriodSummaryProps = Pick<
  LiveMetricsDockProps,
  | 'metricsLanguageView'
  | 'metricsRangeView'
  | 'languageTodaySummary'
  | 'onChangeMetricsRangeView'
  | 'formatDuration'
>;

export function LiveMetricsPeriodSummary({
  metricsLanguageView,
  metricsRangeView,
  languageTodaySummary,
  onChangeMetricsRangeView,
  formatDuration,
}: LiveMetricsPeriodSummaryProps) {
  return (
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
  );
}
