import { formatPercent } from './adaptiveWorkspaceViewHelpers';
import type { AdaptiveBenchmarkCockpitProps, AdaptiveBenchmarkCockpitRuntime } from './AdaptiveBenchmarkCockpitTypes';
import { AdaptiveBenchmarkCollapsibleSection, Metric } from './AdaptiveBenchmarkCockpitWidgets';

export function AdaptiveBenchmarkTimelineSection({
  profile,
  debugLatest,
  formatSessionDate,
  runtime,
}: Pick<AdaptiveBenchmarkCockpitProps, 'profile' | 'formatSessionDate'> & {
  debugLatest: AdaptiveBenchmarkCockpitRuntime['debugLatest'];
  runtime: Pick<AdaptiveBenchmarkCockpitRuntime, 'workspaceSubsectionsExpanded' | 'setWorkspaceSubsectionsExpanded'>;
}) {
  return (
    <AdaptiveBenchmarkCollapsibleSection eyebrow="Diagnostics" title="Recent decisions" sectionId="timeline" runtime={runtime}>
      <div className="adaptive-benchmark-grid">
        <section className="adaptive-benchmark-subpanel adaptive-benchmark-timeline">
          <h4>Timeline and debug</h4>
          <div className="today-summary-grid">
            <Metric label="Sessions" value={String(profile.sessionCount)} />
            <Metric label="Samples" value={String(profile.sampleCount)} />
            <Metric label="Window" value={`${profile.rollingWindowDays} days`} />
            <Metric label="Last update" value={profile.lastUpdatedAt ? formatSessionDate(profile.lastUpdatedAt) : 'n/a'} />
            <Metric label="Phrase index" value={debugLatest?.phraseIndex !== undefined ? `${debugLatest.phraseIndex}/${debugLatest.totalSemanticPhrases ?? 'n/a'}` : 'n/a'} />
            <Metric label="Pacing mode" value={debugLatest?.mode ?? 'n/a'} />
            <Metric label="Decision" value={debugLatest?.decisionReason ?? 'n/a'} />
            <Metric label="Hint" value={debugLatest?.executionHint ?? 'n/a'} />
          </div>
          <div className="adaptive-timeline-row">
            {profile.timeline.slice(-60).map((point, index) => (
              <span
                key={`${point.timestampMs}-${index}`}
                className={`adaptive-timeline-dot adaptive-timeline-dot-${point.event ?? point.mode}`}
                title={`${point.event ?? point.mode} · ${point.playbackRate.toFixed(2)}x · ${formatPercent(point.accuracy)}`}
              />
            ))}
          </div>
        </section>
      </div>
    </AdaptiveBenchmarkCollapsibleSection>
  );
}
