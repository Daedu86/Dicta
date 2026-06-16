import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { clamp01, toPercent } from './adaptiveBenchmarkChartUtils';

export function SweetSpotGauge({ score }: { score: number }) {
  const value = clamp01(score);
  const data = [{ name: 'score', value: Math.round(value * 1000) / 10 }];
  return (
    <div className="adaptive-gauge" role="img" aria-label="Sweet spot score gauge">
      <ResponsiveContainer width="100%" height="100%" minWidth={120} minHeight={120}>
        <RadialBarChart
          data={data}
          innerRadius="72%"
          outerRadius="100%"
          startAngle={210}
          endAngle={-30}
          barSize={14}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={10}
            fill="url(#adaptiveGaugeGradient)"
            isAnimationActive={false}
          />
          <defs>
            <linearGradient id="adaptiveGaugeGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4be1b3" stopOpacity={0.95} />
              <stop offset="55%" stopColor="#2f80ed" stopOpacity={0.92} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.9} />
            </linearGradient>
          </defs>
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="adaptive-gauge-center">
        <span>Sweet spot</span>
        <strong>{toPercent(value)}%</strong>
      </div>
    </div>
  );
}
