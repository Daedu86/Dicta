import type { AdaptiveLatestSession } from './AdaptiveAdvancedDiagnosticsTypes';
import { formatTrendLabel } from './AdaptiveAdvancedDiagnosticsHelpers';
import { AdaptiveAdvancedChartBar, AdaptiveAdvancedMetric, AdaptiveAdvancedSectionHeader } from './AdaptiveAdvancedDiagnosticsWidgets';

export function AdaptiveAdvancedLiveStatePanel({
  expanded,
  latestSession,
  latestAdaptiveMode,
  onToggle,
}: {
  expanded: boolean;
  latestSession: AdaptiveLatestSession | null;
  latestAdaptiveMode: string;
  onToggle: () => void;
}) {
  if (!latestSession) return null;

  return (
    <section className="panel workspace-panel adaptive-metrics-panel">
      <AdaptiveAdvancedSectionHeader
        eyebrow="Live state"
        title="Latest pacing snapshot"
        meta="Most recent metrics computed from the stored session."
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded ? (
        <>
          <div className="bottom-summary-grid">
            <AdaptiveAdvancedMetric label="Mode" value={latestAdaptiveMode} ariaLabel={`Mode: ${latestAdaptiveMode}`} />
            <AdaptiveAdvancedMetric label="Rate" value={`${latestSession.metrics.rate.toFixed(2)}x`} ariaLabel={`Rate: ${latestSession.metrics.rate.toFixed(2)}x`} />
            <AdaptiveAdvancedMetric label="Lag" value={`${latestSession.metrics.lagSec.toFixed(2)}s`} ariaLabel={`Lag: ${latestSession.metrics.lagSec.toFixed(2)}s`} />
            <AdaptiveAdvancedMetric label="Lag words" value={String(latestSession.metrics.lagWords)} ariaLabel={`Lag words: ${String(latestSession.metrics.lagWords)}`} />
            <AdaptiveAdvancedMetric label="WPM" value={latestSession.metrics.wpm.toFixed(1)} ariaLabel={`WPM: ${latestSession.metrics.wpm.toFixed(1)}`} />
            <AdaptiveAdvancedMetric label="Accuracy" value={`${latestSession.metrics.accuracy.toFixed(1)}%`} ariaLabel={`Accuracy: ${latestSession.metrics.accuracy.toFixed(1)}%`} />
            <AdaptiveAdvancedMetric label="Trend" value={formatTrendLabel(latestSession.metrics.trend)} ariaLabel={`Trend: ${formatTrendLabel(latestSession.metrics.trend)}`} />
          </div>
          <div className="today-chart-row">
            <AdaptiveAdvancedChartBar label="Actions" widthPercent={latestSession.telemetry.actions.length * 4} />
            <AdaptiveAdvancedChartBar label="Telemetry samples" widthPercent={latestSession.telemetry.lagSeries.length} />
          </div>
        </>
      ) : null}
    </section>
  );
}
