import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import { ADAPTIVE_CHART_TOOLTIP_STYLE, buildLagDistributionData } from './adaptiveBenchmarkChartUtils';

export function LagDistributionChart({ profile }: { profile: InputLanguageBenchmarkMetrics }) {
  const data = buildLagDistributionData(profile);
  const total = data.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div className="adaptive-lag-distribution" role="img" aria-label="Lag distribution">
      <div className="adaptive-mini-trends-header">
        <span>Lag distribution</span>
        <strong>{total} pts</strong>
      </div>
      {total === 0 ? (
        <div className="adaptive-chart-empty">No lag samples yet</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%" minWidth={180} minHeight={130}>
          <BarChart data={data} margin={{ top: 8, right: 10, bottom: 8, left: -20 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.20)" strokeDasharray="4 6" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'rgba(226, 232, 240, 0.70)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: 'rgba(226, 232, 240, 0.70)', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              cursor={{ fill: 'rgba(96, 165, 250, 0.10)' }}
              contentStyle={ADAPTIVE_CHART_TOOLTIP_STYLE}
            />
            <Bar dataKey="count" fill="rgba(96, 165, 250, 0.86)" radius={[8, 8, 2, 2]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
