import type { ReactNode } from 'react';

export function AdaptiveAdvancedSectionHeader({
  eyebrow,
  title,
  meta,
  expanded,
  onToggle,
}: {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="adaptive-section-header">
      <div>
        <p className="dashboard-eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        {meta ? <p className="dashboard-meta">{meta}</p> : null}
      </div>
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
  );
}

export function AdaptiveAdvancedMetric({
  label,
  value,
  ariaLabel,
  title,
}: {
  label: string;
  value: ReactNode;
  ariaLabel?: string;
  title?: string;
}) {
  return (
    <div className="metric" aria-label={ariaLabel} title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AdaptiveAdvancedChartBar({
  label,
  widthPercent,
}: {
  label: ReactNode;
  widthPercent: number;
}) {
  return (
    <div className="today-chart-bar">
      <span className="today-chart-label">{label}</span>
      <div className="today-chart-track">
        <div className="today-chart-fill" style={{ width: `${Math.min(100, Math.max(0, widthPercent))}%` }} />
      </div>
    </div>
  );
}
