import type { ControlAction, SessionTelemetry } from '../types/dictation';

type DashboardActionTimelinePoint = {
  time: number;
  action: ControlAction;
  actionLabel: string;
  level: number;
};

export const ACTION_LABELS = ['Slow', 'Hold', 'Fast', 'Repeat'];
export const ACTION_ORDER: Partial<Record<ControlAction, number>> = {
  speed_down: 0,
  hold: 1,
  speed_up: 2,
  pause_repeat: 3,
  manual_slow: 0,
  manual_fast: 2,
  replay_phrase: 3,
  rewind_phrase: 3,
};
export const ACTION_COLORS: Partial<Record<ControlAction, string>> = {
  speed_down: '#e6a23c',
  hold: '#102f63',
  speed_up: '#17825c',
  pause_repeat: '#c44545',
  manual_slow: '#e6a23c',
  manual_fast: '#17825c',
  replay_phrase: '#c44545',
  rewind_phrase: '#c44545',
};

export const GRID_STROKE = '#d7e2ee';
export const GRID_DASH = '4 6';
export const AXIS_TICK = { fill: '#4e6076', fontSize: 11 };
export const TOOLTIP_STYLE = { borderRadius: 10, borderColor: '#bfd2e8', color: '#102f63' };
export const TOOLTIP_CURSOR = { stroke: '#7aa9df', strokeWidth: 1 };

export function buildLineChartData(series: number[]): Array<{ index: number; label: string; value: number }> {
  return series.map((value, index) => ({
    index: index + 1,
    label: `Sample ${index + 1}`,
    value,
  }));
}

export function buildRateDistributionBars(rateDistribution: Array<{ rate: number; seconds: number }>): Array<{ rate: string; seconds: number }> {
  return rateDistribution.map((entry) => ({
    rate: `${entry.rate.toFixed(2)}x`,
    seconds: entry.seconds,
  }));
}

export function buildActionTimelineData(actions: SessionTelemetry['actions']): DashboardActionTimelinePoint[] {
  return actions.slice(-80).map((action) => {
    const level = ACTION_ORDER[action.action] ?? 1;
    return {
      time: action.t,
      action: action.action,
      actionLabel: ACTION_LABELS[level],
      level,
    };
  });
}

export function formatActionTimelineTooltipLabel(payload: { time?: number } | undefined): string {
  return payload?.time !== undefined ? `${payload.time.toFixed(1)}s` : 'Action';
}
