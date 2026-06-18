import type { MetricsRangeView } from '../../core/liveMetrics';

const RANGE_TABS: Array<[MetricsRangeView, string]> = [
  ['today', 'Today'],
  ['tenDays', '10 days'],
  ['twentyDays', '20 days'],
];

type LiveMetricsRangeTabsProps = {
  metricsRangeView: MetricsRangeView;
  onChangeMetricsRangeView: (range: MetricsRangeView) => void;
};

export function LiveMetricsRangeTabs({ metricsRangeView, onChangeMetricsRangeView }: LiveMetricsRangeTabsProps) {
  return (
    <div className="live-metrics-range-tabs" role="group" aria-label="Live metrics range">
      {RANGE_TABS.map(([code, label]) => {
        const isActive = metricsRangeView === code || (code === 'twentyDays' && metricsRangeView === 'month');
        return (
          <button
            key={code}
            type="button"
            className={`live-metrics-range-tab ${isActive ? 'live-metrics-range-tab-active' : ''}`}
            onClick={() => onChangeMetricsRangeView(code)}
            aria-pressed={isActive}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
