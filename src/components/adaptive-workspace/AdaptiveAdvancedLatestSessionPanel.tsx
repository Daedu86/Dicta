import { formatSessionPointsForSession } from '../../core/evaluation';
import { buildSessionScoreHelpText } from '../../core/sessionScore';
import type { AdaptiveAdapterCardConfig } from './types';
import type { AdaptiveLatestSession } from './AdaptiveAdvancedDiagnosticsTypes';
import { formatSessionInputMode, formatSessionPlaybackDuration } from './AdaptiveAdvancedDiagnosticsHelpers';
import { AdaptiveAdvancedMetric, AdaptiveAdvancedSectionHeader } from './AdaptiveAdvancedDiagnosticsWidgets';

export function AdaptiveAdvancedLatestSessionPanel({
  expanded,
  latestSession,
  latestInputAdapter,
  onToggle,
}: {
  expanded: boolean;
  latestSession: AdaptiveLatestSession | null;
  latestInputAdapter: AdaptiveAdapterCardConfig | null;
  onToggle: () => void;
}) {
  return (
    <section className="panel workspace-panel adaptive-summary-panel">
      <AdaptiveAdvancedSectionHeader eyebrow="Session" title="Most recent run" expanded={expanded} onToggle={onToggle} />
      {expanded ? (
        latestSession ? (
          <div className="bottom-summary-grid">
            <AdaptiveAdvancedMetric label="Session" value={latestSession.name || 'Untitled'} ariaLabel={`Session: ${latestSession.name || 'Untitled'}`} />
            <AdaptiveAdvancedMetric
              label="Input mode"
              value={formatSessionInputMode(latestSession.inputMode)}
              ariaLabel={`Input mode: ${formatSessionInputMode(latestSession.inputMode)}`}
            />
            <AdaptiveAdvancedMetric label="Adapter" value={latestInputAdapter?.adapter ?? 'Not set'} ariaLabel={`Adapter: ${latestInputAdapter?.adapter ?? 'Not set'}`} />
            <AdaptiveAdvancedMetric label="Updated" value={new Date(latestSession.updatedAt).toLocaleString()} ariaLabel={`Updated: ${new Date(latestSession.updatedAt).toLocaleString()}`} />
            <AdaptiveAdvancedMetric label="Duration" value={formatSessionPlaybackDuration(latestSession)} ariaLabel={`Duration: ${formatSessionPlaybackDuration(latestSession)}`} />
            <AdaptiveAdvancedMetric
              label="Score"
              value={String(latestSession.metrics.score)}
              title={buildSessionScoreHelpText(latestSession.metrics)}
              ariaLabel={`Score: ${String(latestSession.metrics.score)}. ${buildSessionScoreHelpText(latestSession.metrics)}`}
            />
            <AdaptiveAdvancedMetric
              label="Points"
              value={formatSessionPointsForSession(latestSession.metrics.points, latestSession)}
              ariaLabel={`Points: ${formatSessionPointsForSession(latestSession.metrics.points, latestSession)}`}
            />
          </div>
        ) : (
          <p className="hint">No session data available yet.</p>
        )
      ) : null}
    </section>
  );
}
