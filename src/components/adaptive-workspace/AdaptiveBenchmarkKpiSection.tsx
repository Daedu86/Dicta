import { formatPercent, formatScore } from './adaptiveWorkspaceViewHelpers';
import type { AdaptiveBenchmarkCockpitProps, AdaptiveBenchmarkCockpitRuntime } from './AdaptiveBenchmarkCockpitTypes';
import { AdaptiveBenchmarkCollapsibleSection, Metric } from './AdaptiveBenchmarkCockpitWidgets';

export function AdaptiveBenchmarkKpiSection({
  profile,
  runtime,
}: Pick<AdaptiveBenchmarkCockpitProps, 'profile'> & {
  runtime: Pick<AdaptiveBenchmarkCockpitRuntime, 'workspaceSubsectionsExpanded' | 'setWorkspaceSubsectionsExpanded'>;
}) {
  return (
    <AdaptiveBenchmarkCollapsibleSection eyebrow="Benchmarks" title="Aggregate benchmark metrics" sectionId="kpis" runtime={runtime}>
      <div className="today-summary-grid">
        <Metric label="Sweet Spot Score" value={formatScore(profile.sweetSpotScore)} />
        <Metric label="Semantic Fidelity" value={formatScore(profile.semanticFidelityScore)} />
        <Metric label="Control Fidelity" value={formatScore(profile.controlFidelityScore)} />
        <Metric label="Learning Effectiveness" value={formatScore(profile.learningEffectivenessScore)} />
        <Metric label="Flow Stability" value={formatScore(profile.flowStabilityScore)} />
        <Metric label="Avg accuracy" value={`${formatPercent(profile.averageAccuracy)}`} />
        <Metric label="Avg WPM" value={profile.averageWpm.toFixed(1)} />
        <Metric label="Avg lag" value={`${profile.averageLagSec.toFixed(2)}s`} />
        <Metric label="Preferred rate" value={`${profile.preferredPlaybackRate.toFixed(2)}x`} />
        <Metric label="Preferred phrase" value={profile.preferredPhraseSize} />
      </div>
    </AdaptiveBenchmarkCollapsibleSection>
  );
}
