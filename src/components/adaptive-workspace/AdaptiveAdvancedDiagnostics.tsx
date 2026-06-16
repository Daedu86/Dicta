import { AdaptiveAdvancedAdaptersPanel } from './AdaptiveAdvancedAdaptersPanel';
import { AdaptiveAdvancedArchitecturePanel, AdaptiveAdvancedDecisionPanel } from './AdaptiveAdvancedDecisionArchitecturePanels';
import { AdaptiveAdvancedLatestSessionPanel } from './AdaptiveAdvancedLatestSessionPanel';
import { AdaptiveAdvancedLiveStatePanel } from './AdaptiveAdvancedLiveStatePanel';
import { AdaptiveAdvancedTelemetryPanel } from './AdaptiveAdvancedTelemetryPanel';
import type { AdaptiveAdvancedDiagnosticsProps } from './AdaptiveAdvancedDiagnosticsTypes';

export type {
  AdaptiveAdvancedDiagnosticsExpandedState,
  AdaptiveAdvancedDiagnosticsProps,
  AdaptiveLatestSession,
  AdaptiveSemanticDebug,
  AdaptiveSessionMetrics,
} from './AdaptiveAdvancedDiagnosticsTypes';

export function AdaptiveAdvancedDiagnostics({
  adaptiveSectionExpanded,
  adaptiveAdapters,
  latestSession,
  latestInputAdapter,
  latestAdaptiveMode,
  selectedBenchmarkInputMode,
  adaptiveSemanticDebug,
  mapSessionInputMode,
  onToggleDecisionArchitectureSections,
  onToggleAdaptersSection,
  onToggleLatestSections,
  onToggleTelemetrySection,
  onOpenAdapter,
}: AdaptiveAdvancedDiagnosticsProps) {
  return (
    <details className="adaptive-advanced-shell">
      <summary>
        <span>
          <strong>Advanced diagnostics</strong>
          <small>Architecture, adapters, latest run, and debug counters</small>
        </span>
      </summary>
      <div className="adaptive-advanced-grid">
        <AdaptiveAdvancedDecisionPanel
          expanded={adaptiveSectionExpanded.decision}
          latestAdaptiveMode={latestAdaptiveMode}
          onToggle={onToggleDecisionArchitectureSections}
        />
        <AdaptiveAdvancedArchitecturePanel
          expanded={adaptiveSectionExpanded.architecture}
          onToggle={onToggleDecisionArchitectureSections}
        />
        <AdaptiveAdvancedAdaptersPanel
          expanded={adaptiveSectionExpanded.adapters}
          adaptiveAdapters={adaptiveAdapters}
          latestSession={latestSession}
          selected={selectedBenchmarkInputMode}
          mapSessionInputMode={mapSessionInputMode}
          onToggle={onToggleAdaptersSection}
          onOpenAdapter={onOpenAdapter}
        />
        <AdaptiveAdvancedLatestSessionPanel
          expanded={adaptiveSectionExpanded.latest}
          latestSession={latestSession}
          latestInputAdapter={latestInputAdapter}
          onToggle={onToggleLatestSections}
        />
        <AdaptiveAdvancedLiveStatePanel
          expanded={adaptiveSectionExpanded.live}
          latestSession={latestSession}
          latestAdaptiveMode={latestAdaptiveMode}
          onToggle={onToggleLatestSections}
        />
        <AdaptiveAdvancedTelemetryPanel
          expanded={adaptiveSectionExpanded.telemetry}
          latestSession={latestSession}
          adaptiveSemanticDebug={adaptiveSemanticDebug}
          onToggle={onToggleTelemetrySection}
        />
      </div>
    </details>
  );
}
