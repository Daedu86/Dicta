import { AdaptiveBenchmarkMetric } from './AdaptiveBenchmarkMetric';
import type { AdaptiveAdapterCardProps } from './adaptiveBenchmarkWorkspaceTypes';

export function AdaptiveAdapterCard({ adapter, active, selected, onOpen }: AdaptiveAdapterCardProps) {
  return (
    <button
      type="button"
      className={`adaptive-adapter-card ${active ? 'adaptive-adapter-card-active' : ''} ${selected ? 'adaptive-adapter-card-selected' : ''}`}
      onClick={onOpen}
    >
      <div className="adaptive-adapter-card-header">
        <h4>{adapter.title}</h4>
        {active ? <span>Latest</span> : null}
      </div>
      <p>{adapter.execution}</p>
      <div className="adaptive-adapter-meta">
        <AdaptiveBenchmarkMetric label="Telemetry adapter" value={adapter.adapter} />
        <AdaptiveBenchmarkMetric label="Controls" value={adapter.controls} />
      </div>
    </button>
  );
}
