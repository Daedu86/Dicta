import type { LeaderboardRangeMetric, MetricComponentType } from './leaderboardWorkspaceTypes';

type LeaderboardRangeMetricsProps = {
  sectionLabel: string;
  rangeMetrics: LeaderboardRangeMetric[];
  MetricComponent: MetricComponentType;
};

export function LeaderboardRangeMetrics({ sectionLabel, rangeMetrics, MetricComponent }: LeaderboardRangeMetricsProps) {
  return (
    <div className="leaderboard-range-metrics" aria-label={`${sectionLabel} average metrics`}>
      {rangeMetrics.map((rangeMetric) => (
        <section key={rangeMetric.range} className="leaderboard-range-panel">
          <h4>{rangeMetric.label}</h4>
          <div className="leaderboard-range-grid">
            <MetricComponent label="Sessions" value={String(rangeMetric.sessionCount)} />
            <MetricComponent label="Duration" value={rangeMetric.durationLabel} />
            <MetricComponent label="Avg points" value={rangeMetric.avgPointsLabel} />
            <MetricComponent label="Avg score" value={rangeMetric.avgScoreLabel} />
            <MetricComponent label="Avg accuracy" value={rangeMetric.avgAccuracyLabel} />
            <MetricComponent label="Avg WPM" value={rangeMetric.avgWpmLabel} />
          </div>
        </section>
      ))}
    </div>
  );
}
