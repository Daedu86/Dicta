import type { ReactNode } from 'react';
import { chartHelpText } from './sessionDashboardWidgetHelpText';

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
