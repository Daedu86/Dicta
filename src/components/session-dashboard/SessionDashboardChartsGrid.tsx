import { lazy, Suspense } from 'react';
import type { SessionTelemetry } from '../../types/dictation';
import { ChartLoadingState, DashboardChart, WidgetTools, chartHelpText } from './SessionDashboardWidgetTools';

const DashboardLineChart = lazy(() =>
  import('../DashboardCharts').then((module) => ({ default: module.DashboardLineChart })),
);
const DashboardRateBars = lazy(() =>
  import('../DashboardCharts').then((module) => ({ default: module.DashboardRateBars })),
);
const DashboardActionTimeline = lazy(() =>
  import('../DashboardCharts').then((module) => ({ default: module.DashboardActionTimeline })),
);

export function SessionDashboardChartsGrid({ telemetry, insights }: { telemetry: SessionTelemetry; insights: string[] }) {
  return (
    <div className="dashboard-grid">
      <DashboardChart
        widgetIndex={2}
        title="Accuracy over time"
        empty={telemetry.accuracySeries.length === 0}
        copyText={`Accuracy over time: ${telemetry.accuracySeries.length > 0 ? telemetry.accuracySeries.map((value) => value.toFixed(1)).join(', ') : 'No data'}`}
      >
        <Suspense fallback={<ChartLoadingState />}>
          <DashboardLineChart series={telemetry.accuracySeries} min={0} max={100} suffix="%" />
        </Suspense>
      </DashboardChart>
      <DashboardChart
        widgetIndex={3}
        title="WPM over time"
        empty={telemetry.wpmSeries.length === 0}
        copyText={`WPM over time: ${telemetry.wpmSeries.length > 0 ? telemetry.wpmSeries.map((value) => value.toFixed(1)).join(', ') : 'No data'}`}
      >
        <Suspense fallback={<ChartLoadingState />}>
          <DashboardLineChart series={telemetry.wpmSeries} min={0} max={Math.max(120, ...telemetry.wpmSeries)} />
        </Suspense>
      </DashboardChart>
      <DashboardChart
        widgetIndex={4}
        title="Lag over time"
        empty={telemetry.lagSeries.length === 0}
        copyText={`Lag over time: ${telemetry.lagSeries.length > 0 ? telemetry.lagSeries.map((value) => value.toFixed(2)).join(', ') : 'No data'}`}
      >
        <Suspense fallback={<ChartLoadingState />}>
          <DashboardLineChart series={telemetry.lagSeries} min={-10} max={10} suffix="s" />
        </Suspense>
      </DashboardChart>
      <DashboardChart
        widgetIndex={5}
        title="Playback rate distribution"
        empty={telemetry.rateDistribution.length === 0}
        copyText={`Playback rate distribution: ${telemetry.rateDistribution.length > 0 ? telemetry.rateDistribution.map((entry) => `${entry.rate.toFixed(2)}x=${Math.round(entry.seconds)}s`).join(', ') : 'No data'}`}
      >
        <Suspense fallback={<ChartLoadingState />}>
          <DashboardRateBars rateDistribution={telemetry.rateDistribution} />
        </Suspense>
      </DashboardChart>
      <DashboardChart
        widgetIndex={6}
        title="Controller action timeline"
        empty={telemetry.actions.length === 0}
        copyText={`Controller actions: ${telemetry.actions.length > 0 ? telemetry.actions.map((action) => `${action.action}@${action.t.toFixed(1)}s`).join(', ') : 'No data'}`}
      >
        <Suspense fallback={<ChartLoadingState />}>
          <DashboardActionTimeline actions={telemetry.actions} />
        </Suspense>
      </DashboardChart>
      <section className="dashboard-card dashboard-insights">
        <div className="dashboard-card-header">
          <h3>Widget #7 - Coaching insights</h3>
          <WidgetTools
            tooltip={chartHelpText('Coaching insights') ?? ''}
            copyText={`Coaching insights: ${insights.length > 0 ? insights.join(' | ') : 'No insights'}`}
          />
        </div>
        <div className="insight-list">
          {insights.map((insight) => (
            <p key={insight}>{insight}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
