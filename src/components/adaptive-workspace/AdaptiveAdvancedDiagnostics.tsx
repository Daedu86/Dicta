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
  latestSession,
  latestInputAdapter,
  latestAdaptiveMode,
  adaptiveSemanticDebug,
  onToggleDecisionArchitectureSections,
  onToggleLatestSections,
  onToggleTelemetrySection,
}: AdaptiveAdvancedDiagnosticsProps) {
  return (
    <details className="adaptive-advanced-shell">
      <summary>
        <span>
          <strong>Advanced diagnostics</strong>
          <small>Architecture, latest run, and debug counters</small>
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
