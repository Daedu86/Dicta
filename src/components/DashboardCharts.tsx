import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SessionTelemetry } from '../types/dictation';
import {
  ACTION_COLORS,
  ACTION_LABELS,
  AXIS_TICK,
  GRID_DASH,
  GRID_STROKE,
  TOOLTIP_CURSOR,
  TOOLTIP_STYLE,
  buildActionTimelineData,
  buildLineChartData,
  buildRateDistributionBars,
  formatActionTimelineTooltipLabel,
} from './dashboardChartHelpers';

type DashboardLineChartProps = {
  series: number[];
  min: number;
  max: number;
  suffix?: string;
};

type DashboardRateBarsProps = {
  rateDistribution: Array<{ rate: number; seconds: number }>;
};

type DashboardActionTimelineProps = {
  actions: SessionTelemetry['actions'];
};

export function DashboardLineChart({ series, min, max, suffix = '' }: DashboardLineChartProps) {
  const data = buildLineChartData(series);
  const last = series[series.length - 1] ?? 0;

  return (
    <div className="line-chart">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 8, right: 8, bottom: 6, left: -24 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray={GRID_DASH} vertical={false} />
          <XAxis dataKey="index" tick={false} axisLine={false} tickLine={false} height={12} />
          <YAxis
            domain={[min, max]}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={42}
            tickFormatter={(value) => `${Number(value).toFixed(0)}${suffix}`}
          />
          <ReferenceLine y={0} stroke="#9cbde3" strokeDasharray="5 5" />
          <Tooltip
            cursor={TOOLTIP_CURSOR}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`${Number(value).toFixed(2)}${suffix}`, 'Value']}
            labelFormatter={(value) => `Sample ${value}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2f80ed"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 4, fill: '#17825c', stroke: '#ffffff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
      <span>
        {last.toFixed(1)}
        {suffix}
      </span>
    </div>
  );
}

export function DashboardRateBars({ rateDistribution }: DashboardRateBarsProps) {
  const entries = buildRateDistributionBars(rateDistribution);

  return (
    <div className="rate-bars" role="img" aria-label="Playback rate distribution">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={entries} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray={GRID_DASH} vertical={false} />
          <XAxis dataKey="rate" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={42}
            tickFormatter={(value) => `${Math.round(Number(value))}s`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(90, 148, 232, 0.12)' }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`${Math.round(Number(value))}s`, 'Seconds']}
          />
          <Bar dataKey="seconds" radius={[8, 8, 0, 0]} fill="#2f80ed" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardActionTimeline({ actions }: DashboardActionTimelineProps) {
  const data = buildActionTimelineData(actions);

  return (
    <div className="action-timeline" role="img" aria-label="Controller action timeline">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 10, bottom: 12, left: -12 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray={GRID_DASH} vertical={false} />
          <XAxis
            type="number"
            dataKey="time"
            name="Time"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${Number(value).toFixed(0)}s`}
          />
          <YAxis
            type="number"
            dataKey="level"
            name="Action"
            domain={[-0.5, 3.5]}
            ticks={[0, 1, 2, 3]}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={58}
            tickFormatter={(value) => ACTION_LABELS[Number(value)] ?? ''}
          />
          <Tooltip
            cursor={TOOLTIP_CURSOR}
            contentStyle={TOOLTIP_STYLE}
            formatter={(_, __, props) => [props.payload.actionLabel, 'Action']}
            labelFormatter={(_, payload) => formatActionTimelineTooltipLabel(payload?.[0]?.payload)}
          />
          <Scatter data={data} dataKey="level" isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`${entry.time}-${index}`} fill={ACTION_COLORS[entry.action] ?? '#5a94e8'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
