import type { ReactNode } from 'react';
import type { AdaptiveBenchmarkCockpitRuntime, AdaptiveBenchmarkCockpitSectionId } from './AdaptiveBenchmarkCockpitTypes';

export function AdaptiveChartLoadingState() {
  return <div className="dashboard-empty-wrap"><p className="dashboard-empty">Loading benchmark chart...</p></div>;
}

export function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AdaptiveBenchmarkSectionHeader({
  eyebrow,
  title,
  sectionId,
  runtime,
}: {
  eyebrow: string;
  title: string;
  sectionId: AdaptiveBenchmarkCockpitSectionId;
  runtime: Pick<AdaptiveBenchmarkCockpitRuntime, 'workspaceSubsectionsExpanded' | 'setWorkspaceSubsectionsExpanded'>;
}) {
  const expanded = runtime.workspaceSubsectionsExpanded[sectionId];
  return (
    <div className="adaptive-section-header adaptive-subsection-header">
      <div>
        <p className="dashboard-eyebrow">{eyebrow}</p>
        <h4>{title}</h4>
      </div>
      <button
        type="button"
        className="secondary-button adaptive-section-toggle"
        onClick={() => runtime.setWorkspaceSubsectionsExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse section' : 'Expand section'}
        title={expanded ? 'Collapse' : 'Expand'}
      >
        <span className={`adaptive-section-toggle-icon ${expanded ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
      </button>
    </div>
  );
}

export function AdaptiveBenchmarkCollapsibleSection({
  eyebrow,
  title,
  sectionId,
  runtime,
  children,
}: {
  eyebrow: string;
  title: string;
  sectionId: AdaptiveBenchmarkCockpitSectionId;
  runtime: Pick<AdaptiveBenchmarkCockpitRuntime, 'workspaceSubsectionsExpanded' | 'setWorkspaceSubsectionsExpanded'>;
  children: ReactNode;
}) {
  return (
    <>
      <AdaptiveBenchmarkSectionHeader eyebrow={eyebrow} title={title} sectionId={sectionId} runtime={runtime} />
      {runtime.workspaceSubsectionsExpanded[sectionId] ? children : null}
    </>
  );
}
