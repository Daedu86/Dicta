import type { SessionTelemetry } from '../../types/dictation';
import type { DashboardGoals, SessionDashboardSession } from './sessionDashboardTypes';
import { WidgetTools } from './SessionDashboardWidgetTools';

export function SessionDashboardKpiSection<TSession extends SessionDashboardSession = SessionDashboardSession>({
  session,
  telemetry,
  goals,
  pointsLabel,
  scoreHelpText,
  duration,
}: {
  session: TSession;
  telemetry: SessionTelemetry;
  goals: DashboardGoals;
  pointsLabel: string;
  scoreHelpText: string;
  duration: string;
}) {
  const kpiSectionTooltip = 'Session KPI summary with score, points, accuracy, speed, lag, rate, repeats, and voice duration.';
  const kpiSectionCopyText =
    `Widget #0 - Session KPIs: ` +
    [
      `Score=${session.metrics.score}`,
      `Points=${pointsLabel}`,
      `Accuracy=${session.metrics.accuracy.toFixed(1)}%`,
      `WPM=${session.metrics.wpm.toFixed(1)}`,
      `Lag=${session.metrics.lagSec.toFixed(2)}s`,
      `Rate=${session.metrics.rate.toFixed(2)}x`,
      `Repeats=${telemetry.repeatCount}`,
      `Duration=${duration}`,
    ].join(', ');

  return (
    <section className="dashboard-kpi-section">
      <div className="dashboard-card-header dashboard-kpi-section-header">
        <h3>Widget #0 - Session KPIs</h3>
        <WidgetTools tooltip={kpiSectionTooltip} copyText={kpiSectionCopyText} />
      </div>
      <div className="dashboard-kpis">
        <DashboardKpi label="Score" value={String(session.metrics.score)} helpText={scoreHelpText} />
        <DashboardKpi label="Points" value={pointsLabel} />
        <DashboardKpi label="Accuracy" value={`${session.metrics.accuracy.toFixed(1)}%`} target={`${goals.accuracy.toFixed(0)}% goal`} />
        <DashboardKpi label="WPM" value={session.metrics.wpm.toFixed(1)} target={`${goals.wpmMin}-${goals.wpmMax} goal`} />
        <DashboardKpi label="Lag" value={`${session.metrics.lagSec.toFixed(2)}s`} target={`${goals.lagMin}-${goals.lagMax}s goal`} />
        <DashboardKpi label="Rate" value={`${session.metrics.rate.toFixed(2)}x`} />
        <DashboardKpi label="Repeats" value={String(telemetry.repeatCount)} target={`<= ${goals.repeatsMax} goal`} />
        <DashboardKpi label="Duration" value={duration} />
      </div>
    </section>
  );
}

function DashboardKpi({ label, value, target, helpText }: { label: string; value: string; target?: string; helpText?: string }) {
  const tooltip = helpText ?? kpiHelpText(label);
  const copyText = `${label}: ${value}${target ? ` (${target})` : ''}`;
  return (
    <div className="dashboard-kpi" title={tooltip ?? undefined} aria-label={tooltip ? `${label}: ${value}. ${tooltip}` : undefined}>
      {tooltip ? <WidgetTools tooltip={tooltip} copyText={copyText} /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {target ? <small>{target}</small> : null}
    </div>
  );
}

function kpiHelpText(label: string): string | null {
  const map: Record<string, string> = {
    Score: 'Overall performance score derived from accuracy, pace, lag, and points.',
    Points: 'Word-matching points earned from your typed attempt versus target words.',
    Accuracy: 'Percent of typed words matching target words, including fuzzy matches.',
    WPM: 'Typing speed estimate in words per minute during the attempt.',
    Lag: 'How far typing progress is behind or ahead of expected playback position in seconds.',
    Rate: 'Playback speed multiplier used during the session.',
    Repeats: 'How many times a segment or phrase was repeated during the attempt.',
    Duration: 'Voice/audio playback duration, aligned with the media player duration.',
  };
  return map[label] ?? null;
}
