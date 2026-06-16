import type { AdaptiveAdvancedDiagnosticsExpandedState } from './AdaptiveAdvancedDiagnosticsTypes';
import { AdaptiveAdvancedMetric, AdaptiveAdvancedSectionHeader } from './AdaptiveAdvancedDiagnosticsWidgets';

export function AdaptiveAdvancedDecisionPanel({
  expanded,
  latestAdaptiveMode,
  onToggle,
}: {
  expanded: boolean;
  latestAdaptiveMode: string;
  onToggle: () => void;
}) {
  return (
    <section className="panel workspace-panel adaptive-decision-panel">
      <AdaptiveAdvancedSectionHeader eyebrow="Advanced" title="Central Brain" expanded={expanded} onToggle={onToggle} />
      {expanded ? (
        <>
          <p className="dashboard-meta">
            AdaptiveDictationController reads normalized telemetry and chooses support, balanced, or flow pacing for the active input.
          </p>
          <div className="bottom-summary-grid">
            <AdaptiveAdvancedMetric label="Current mode" value={latestAdaptiveMode} ariaLabel={`Current mode: ${latestAdaptiveMode}`} />
            <AdaptiveAdvancedMetric label="Rate range" value="0.75x-1.15x" ariaLabel="Rate range: 0.75x-1.15x" />
            <AdaptiveAdvancedMetric label="Phrase sizes" value="Short / medium / long" ariaLabel="Phrase sizes: Short / medium / long" />
            <AdaptiveAdvancedMetric label="Inputs" value="Lag, accuracy, WPM" ariaLabel="Inputs: Lag, accuracy, WPM" />
            <AdaptiveAdvancedMetric label="Sensitivity" value="Correction + difficulty" ariaLabel="Sensitivity: Correction + difficulty" />
            <AdaptiveAdvancedMetric label="History" value="Profile confidence" ariaLabel="History: Profile confidence" />
          </div>
        </>
      ) : null}
    </section>
  );
}

export function AdaptiveAdvancedArchitecturePanel({
  expanded,
  onToggle,
}: {
  expanded: AdaptiveAdvancedDiagnosticsExpandedState['architecture'];
  onToggle: () => void;
}) {
  return (
    <section className="panel workspace-panel adaptive-architecture-panel">
      <AdaptiveAdvancedSectionHeader
        eyebrow="Architecture"
        title="Centralized decision, input-specific execution"
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded ? (
        <>
          <p>
            Future inputs should plug into the same adapter contract: produce a telemetry frame, request a pacing decision, then apply that decision
            through the input's playback engine.
          </p>
          <div className="adaptive-flow-row">
            <span>Input telemetry</span>
            <span>Adaptive controller</span>
            <span>Input adapter</span>
            <span>Playback behavior</span>
          </div>
        </>
      ) : null}
    </section>
  );
}
