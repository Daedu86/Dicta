import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import { ADAPTIVE_CHART_TOOLTIP_STYLE, buildRateAccuracyData } from './adaptiveBenchmarkChartUtils';

export function RateAccuracyStrip({ profile }: { profile: InputLanguageBenchmarkMetrics }) {
  const data = buildRateAccuracyData(profile);

  return (
    <div className="adaptive-rate-strip" role="img" aria-label="Rate accuracy strip">
      <div className="adaptive-mini-trends-header">
        <span>Rate accuracy</span>
        <strong>{data.length} buckets</strong>
      </div>
      {data.length === 0 ? (
        <div className="adaptive-chart-empty">No rate buckets yet</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%" minWidth={180} minHeight={130}>
          <BarChart data={data} margin={{ top: 8, right: 10, bottom: 8, left: -20 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.20)" strokeDasharray="4 6" vertical={false} />
            <XAxis dataKey="rate" tick={{ fill: 'rgba(226, 232, 240, 0.70)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 100]} tick={{ fill: 'rgba(226, 232, 240, 0.70)', fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
            <Tooltip
              cursor={{ fill: 'rgba(96, 165, 250, 0.10)' }}
              contentStyle={ADAPTIVE_CHART_TOOLTIP_STYLE}
              formatter={(value, name, props) => {
                const p = props.payload as { accuracy: number; lag: number; samples: number };
                if (name === 'accuracy') return [`${p.accuracy.toFixed(1)}% · lag ${p.lag.toFixed(2)}s · ${p.samples} samples`, 'Accuracy'];
                return [String(value), String(name)];
              }}
            />
            <Bar dataKey="accuracy" fill="rgba(75, 225, 179, 0.86)" radius={[8, 8, 2, 2]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
