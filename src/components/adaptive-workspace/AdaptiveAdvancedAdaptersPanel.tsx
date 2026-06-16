import { AdaptiveAdapterCard } from './AdaptiveBenchmarkWorkspace';
import type { AdaptiveAdapterCardConfig } from './types';
import type { AdaptiveLatestSession } from './AdaptiveAdvancedDiagnosticsTypes';
import { AdaptiveAdvancedSectionHeader } from './AdaptiveAdvancedDiagnosticsWidgets';

export function AdaptiveAdvancedAdaptersPanel({
  expanded,
  adaptiveAdapters,
  latestSession,
  selected,
  mapSessionInputMode,
  onToggle,
  onOpenAdapter,
}: {
  expanded: boolean;
  adaptiveAdapters: AdaptiveAdapterCardConfig[];
  latestSession: AdaptiveLatestSession | null;
  selected: string;
  mapSessionInputMode: (mode: AdaptiveAdapterCardConfig['inputMode']) => string;
  onToggle: () => void;
  onOpenAdapter: (inputMode: AdaptiveAdapterCardConfig['inputMode']) => void;
}) {
  return (
    <section className="panel workspace-panel adaptive-adapters-panel">
      <AdaptiveAdvancedSectionHeader
        eyebrow="Adapters"
        title="Execution strategies"
        meta="Select an input to focus its benchmark profile below."
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded ? (
        <div className="adaptive-adapter-grid">
          {adaptiveAdapters.map((adapter) => (
            <AdaptiveAdapterCard
              key={adapter.inputMode}
              adapter={adapter}
              active={latestSession?.inputMode === adapter.inputMode}
              selected={selected === mapSessionInputMode(adapter.inputMode)}
              onOpen={() => onOpenAdapter(adapter.inputMode)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
