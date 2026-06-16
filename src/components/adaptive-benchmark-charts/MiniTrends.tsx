import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import { ADAPTIVE_CHART_TOOLTIP_STYLE, buildMiniTrendData } from './adaptiveBenchmarkChartUtils';

export function MiniTrends({
  profile,
  points = 60,
}: {
  profile: InputLanguageBenchmarkMetrics;
  points?: number;
}) {
  const data = buildMiniTrendData(profile, points);
  return (
    <div className="adaptive-mini-trends" role="img" aria-label="Recent trends">
      <div className="adaptive-mini-trends-header">
        <span>Recent</span>
        <strong>{Math.min(points, profile.timeline.length)} pts</strong>
      </div>
      <ResponsiveContainer width="100%" height="100%" minWidth={180} minHeight={120}>
        <LineChart data={data} margin={{ top: 8, right: 10, bottom: 8, left: -20 }}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.20)" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="i" tick={false} axisLine={false} tickLine={false} height={8} />
          <YAxis
            yAxisId="left"
            domain={['auto', 'auto']}
            tick={{ fill: 'rgba(226, 232, 240, 0.75)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={46}
            tickFormatter={(value) => `${Number(value).toFixed(1)}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[60, 100]}
            tick={{ fill: 'rgba(226, 232, 240, 0.65)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(value) => `${Math.round(Number(value))}%`}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(226, 232, 240, 0.2)', strokeWidth: 1 }}
            contentStyle={ADAPTIVE_CHART_TOOLTIP_STYLE}
            formatter={(value, name) => {
              if (name === 'rate') return [`${Number(value).toFixed(2)}x`, 'Rate'];
              if (name === 'lag') return [`${Number(value).toFixed(2)}s`, 'Lag'];
              if (name === 'accuracy') return [`${Number(value).toFixed(1)}%`, 'Accuracy'];
              return [String(value), String(name)];
            }}
          />
          <Line yAxisId="left" type="monotone" dataKey="rate" stroke="rgba(75, 225, 179, 0.9)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line yAxisId="left" type="monotone" dataKey="lag" stroke="rgba(96, 165, 250, 0.85)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="rgba(168, 85, 247, 0.75)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="adaptive-mini-trends-legend">
        <span className="legend-item legend-rate">Rate</span>
        <span className="legend-item legend-lag">Lag</span>
        <span className="legend-item legend-acc">Acc</span>
      </div>
    </div>
  );
}
