import type { ReactNode } from 'react';

export type OpenRouterCollapsibleSectionProps = {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  sectionId?: string;
};

export function OpenRouterCollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
  sectionId,
}: OpenRouterCollapsibleSectionProps) {
  return (
    <div className="dashboard-card admin-card" id={sectionId}>
      <div className="admin-card-header">
        <h3>{title}</h3>
        <button
          type="button"
          className="secondary-button adaptive-section-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse section' : 'Expand section'}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <span className={`adaptive-section-toggle-icon ${expanded ? 'adaptive-section-toggle-icon-open' : ''}`}>⌃</span>
        </button>
      </div>
      {expanded ? children : null}
    </div>
  );
}
