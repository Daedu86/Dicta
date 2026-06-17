import { formatDifficultyLabel } from '../../core/config';
import { LiveMetric } from './LiveMetric';
import type { LiveMetricsDockProps, RuntimeSessionInputMode } from './liveMetricsDockTypes';

type LiveMetricsLastSessionSummaryProps = Pick<
  LiveMetricsDockProps,
  | 'metricsLanguageView'
  | 'lastSessionForLanguage'
  | 'lastSessionScoreHelpText'
  | 'formatSessionInputMode'
  | 'formatDuration'
  | 'formatSessionDate'
>;

export function LiveMetricsLastSessionSummary({
  metricsLanguageView,
  lastSessionForLanguage,
  lastSessionScoreHelpText,
  formatSessionInputMode,
  formatDuration,
  formatSessionDate,
}: LiveMetricsLastSessionSummaryProps) {
  return (
    <section className="bottom-summary-section live-metrics-section live-metrics-section-last">
      <div className="bottom-summary-header">
        <h3>Last Session ({metricsLanguageView.toUpperCase()})</h3>
      </div>
      {!lastSessionForLanguage ? <p className="hint">No sessions found for this language yet.</p> : null}
      <div className="bottom-summary-grid">
        <LiveMetric label="Name" value={lastSessionForLanguage?.name ?? '—'} />
        <LiveMetric
          label="Input mode"
          value={lastSessionForLanguage ? formatSessionInputMode(lastSessionForLanguage.inputMode as RuntimeSessionInputMode) : '—'}
        />
        <LiveMetric
          label="Difficulty"
          value={lastSessionForLanguage?.difficulty ? formatDifficultyLabel(lastSessionForLanguage.difficulty) : '—'}
        />
        <LiveMetric
          label="Score"
          value={lastSessionForLanguage ? String(lastSessionForLanguage.metrics.score) : '—'}
          title={lastSessionScoreHelpText}
        />
        <LiveMetric
          label="Accuracy"
          value={lastSessionForLanguage ? `${lastSessionForLanguage.metrics.accuracy.toFixed(1)}%` : '—'}
        />
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
  );
}
