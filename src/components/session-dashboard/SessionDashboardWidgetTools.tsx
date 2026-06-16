import type { ReactNode } from 'react';

export function DashboardChart({
  widgetIndex,
  title,
  empty,
  copyText,
  children,
}: {
  widgetIndex: number;
  title: string;
  empty: boolean;
  copyText: string;
  children: ReactNode;
}) {
  const tooltip = chartHelpText(title);
  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>{`Widget #${widgetIndex} - ${title}`}</h3>
        {tooltip ? <WidgetTools tooltip={tooltip} copyText={copyText} /> : null}
      </div>
      {empty ? <p className="dashboard-empty">No timeline data for this session yet.</p> : children}
    </section>
  );
}

export function ChartLoadingState() {
  return <p className="dashboard-empty">Loading chart...</p>;
}

export function WidgetTools({ tooltip, copyText }: { tooltip: string; copyText: string }) {
  return (
    <div className="widget-tools">
      <CopyHelpButton text={copyText} />
      <HelpIcon tooltip={tooltip} />
    </div>
  );
}

export function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function chartHelpText(title: string): string | null {
  const map: Record<string, string> = {
    'Accuracy over time': 'Shows how accuracy changes across session samples.',
    'WPM over time': 'Shows how typing speed changes across session samples.',
    'Lag over time': 'Shows timing and position lag trend across session samples.',
    'Playback rate distribution': 'Shows how many seconds were spent at each playback rate.',
    'Controller action timeline': 'Shows when the controller chose hold, speed up, speed down, or pause repeat.',
    'Coaching insights': 'Heuristic coaching notes derived from metrics and telemetry versus goal ranges.',
  };
  return map[title] ?? null;
}

function HelpIcon({ tooltip, ariaLabel = 'Help' }: { tooltip: string; ariaLabel?: string }) {
  return (
    <button
      type="button"
      className="help-icon"
      aria-label={ariaLabel}
      data-tooltip={tooltip}
      onClick={(event) => event.preventDefault()}
    >
      ?
    </button>
  );
}

function CopyHelpButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="copy-help-icon"
      aria-label="Copy values"
      title="Copy values"
      onClick={() => void navigator.clipboard.writeText(text)}
    >
      ⧉
    </button>
  );
}
