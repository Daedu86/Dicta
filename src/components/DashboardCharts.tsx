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
import type { ControlAction, SessionTelemetry } from '../types/dictation';

export function DashboardLineChart({
  series,
  min,
  max,
  suffix = '',
}: {
  series: number[];
  min: number;
  max: number;
  suffix?: string;
}) {
  const data = series.map((value, index) => ({
    index: index + 1,
    label: `Sample ${index + 1}`,
    value,
  }));
  const last = series[series.length - 1] ?? 0;

  return (
    <div className="line-chart">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 8, right: 8, bottom: 6, left: -24 }}>
          <CartesianGrid stroke="#d7e2ee" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="index" tick={false} axisLine={false} tickLine={false} height={12} />
          <YAxis
            domain={[min, max]}
            tick={{ fill: '#4e6076', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
            tickFormatter={(value) => `${Number(value).toFixed(0)}${suffix}`}
          />
          <ReferenceLine y={0} stroke="#9cbde3" strokeDasharray="5 5" />
          <Tooltip
            cursor={{ stroke: '#7aa9df', strokeWidth: 1 }}
            contentStyle={{ borderRadius: 10, borderColor: '#bfd2e8', color: '#102f63' }}
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

export function DashboardRateBars({ rateDistribution }: { rateDistribution: Array<{ rate: number; seconds: number }> }) {
  const entries = rateDistribution.map((entry) => ({
    rate: `${entry.rate.toFixed(2)}x`,
    seconds: entry.seconds,
  }));

  return (
    <div className="rate-bars" role="img" aria-label="Playback rate distribution">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={entries} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
          <CartesianGrid stroke="#d7e2ee" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="rate" tick={{ fill: '#4e6076', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: '#4e6076', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
            tickFormatter={(value) => `${Math.round(Number(value))}s`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(90, 148, 232, 0.12)' }}
            contentStyle={{ borderRadius: 10, borderColor: '#bfd2e8', color: '#102f63' }}
            formatter={(value) => [`${Math.round(Number(value))}s`, 'Seconds']}
          />
          <Bar dataKey="seconds" radius={[8, 8, 0, 0]} fill="#2f80ed" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardActionTimeline({ actions }: { actions: SessionTelemetry['actions'] }) {
  const actionOrder: Partial<Record<ControlAction, number>> = {
    speed_down: 0,
    hold: 1,
    speed_up: 2,
    pause_repeat: 3,
    manual_slow: 0,
    manual_fast: 2,
    replay_phrase: 3,
    rewind_phrase: 3,
  };
  const actionLabels = ['Slow', 'Hold', 'Fast', 'Repeat'];
  const actionColors: Partial<Record<ControlAction, string>> = {
    speed_down: '#e6a23c',
    hold: '#102f63',
    speed_up: '#17825c',
    pause_repeat: '#c44545',
    manual_slow: '#e6a23c',
    manual_fast: '#17825c',
    replay_phrase: '#c44545',
    rewind_phrase: '#c44545',
  };
  const data = actions.slice(-80).map((action) => ({
    time: action.t,
    action: action.action,
    actionLabel: actionLabels[actionOrder[action.action] ?? 1],
    level: actionOrder[action.action] ?? 1,
  }));

  return (
    <div className="action-timeline" role="img" aria-label="Controller action timeline">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 10, bottom: 12, left: -12 }}>
          <CartesianGrid stroke="#d7e2ee" strokeDasharray="4 6" vertical={false} />
          <XAxis
            type="number"
            dataKey="time"
            name="Time"
            tick={{ fill: '#4e6076', fontSize: 11 }}
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
            tick={{ fill: '#4e6076', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={58}
            tickFormatter={(value) => actionLabels[Number(value)] ?? ''}
          />
          <Tooltip
            cursor={{ stroke: '#7aa9df', strokeWidth: 1 }}
            contentStyle={{ borderRadius: 10, borderColor: '#bfd2e8', color: '#102f63' }}
            formatter={(_, __, props) => [props.payload.actionLabel, 'Action']}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as { time?: number } | undefined;
              return item?.time !== undefined ? `${item.time.toFixed(1)}s` : 'Action';
            }}
          />
          <Scatter data={data} dataKey="level" isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`${entry.time}-${index}`} fill={actionColors[entry.action] ?? '#5a94e8'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
