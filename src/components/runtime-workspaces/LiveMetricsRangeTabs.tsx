import type { MetricsRangeView } from '../../core/liveMetrics';

const RANGE_TABS: Array<[MetricsRangeView, string]> = [
  ['today', 'Today'],
  ['week', 'Week'],
  ['twoWeeks', '2 Weeks'],
  ['threeWeeks', '3 Weeks'],
  ['month', '20 days'],
];

type LiveMetricsRangeTabsProps = {
  metricsRangeView: MetricsRangeView;
  onChangeMetricsRangeView: (range: MetricsRangeView) => void;
};

export function LiveMetricsRangeTabs({ metricsRangeView, onChangeMetricsRangeView }: LiveMetricsRangeTabsProps) {
  return (
    <div className="live-metrics-range-tabs" role="group" aria-label="Live metrics range">
      {RANGE_TABS.map(([code, label]) => (
        <button
          key={code}
          type="button"
          className={`live-metrics-range-tab ${metricsRangeView === code ? 'live-metrics-range-tab-active' : ''}`}
          onClick={() => onChangeMetricsRangeView(code)}
          aria-pressed={metricsRangeView === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
