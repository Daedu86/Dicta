import {
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import {
  ADAPTIVE_CHART_TOOLTIP_STYLE,
  buildTargetZoneData,
  defaultTargetZone,
  getTargetZoneLagDomain,
  toPercent,
} from './adaptiveBenchmarkChartUtils';

export function TargetZoneChart({
  profile,
  points = 70,
}: {
  profile: InputLanguageBenchmarkMetrics;
  points?: number;
}) {
  const data = buildTargetZoneData(profile, points);
  const zone = defaultTargetZone();
  const [minLag, maxLag] = getTargetZoneLagDomain(data, zone);

  return (
    <div className="adaptive-zone-chart" role="img" aria-label="Target zone chart">
      <div className="adaptive-zone-chart-header">
        <div>
          <span>Target zone</span>
          <strong>{zone.lagMin.toFixed(1)}s..{zone.lagMax.toFixed(1)}s / {toPercent(zone.accuracyMin)}%+</strong>
        </div>
        <div className="adaptive-zone-kpis">
          <div>
            <span>Avg lag</span>
            <strong>{profile.averageLagSec.toFixed(2)}s</strong>
          </div>
          <div>
            <span>Avg acc</span>
            <strong>{toPercent(profile.averageAccuracy)}%</strong>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%" minWidth={220} minHeight={220}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 12, left: 4 }}>
          <defs>
            <linearGradient id="adaptiveZoneFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(75, 225, 179, 0.20)" />
              <stop offset="100%" stopColor="rgba(47, 128, 237, 0.12)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.26)" strokeDasharray="4 6" vertical={false} />
          <XAxis
            type="number"
            dataKey="lag"
            domain={[minLag, maxLag]}
            tick={{ fill: 'rgba(226, 232, 240, 0.78)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${Number(value).toFixed(1)}s`}
            name="Lag"
          />
          <YAxis
            type="number"
            dataKey="accuracy"
            domain={[0.6, 1]}
            tick={{ fill: 'rgba(226, 232, 240, 0.78)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
            name="Accuracy"
            width={44}
          />
          <ReferenceArea
            x1={zone.lagMin}
            x2={zone.lagMax}
            y1={zone.accuracyMin}
            y2={zone.accuracyMax}
            fill="url(#adaptiveZoneFill)"
            stroke="rgba(75, 225, 179, 0.35)"
            strokeWidth={1}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(226, 232, 240, 0.2)', strokeWidth: 1 }}
            contentStyle={ADAPTIVE_CHART_TOOLTIP_STYLE}
            formatter={(value, name, props) => {
              const p = props.payload as { lag: number; accuracy: number; rate: number; mode: string; event: string };
              if (name === 'accuracy') return [`${toPercent(p.accuracy)}%`, 'Accuracy'];
              if (name === 'lag') return [`${p.lag.toFixed(2)}s`, 'Lag'];
              return [String(value), String(name)];
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as { rate?: number; mode?: string; event?: string } | undefined;
              return p ? `${p.mode} · ${p.rate?.toFixed(2)}x · ${p.event}` : 'Point';
            }}
          />
          <Scatter data={data} fill="#60a5fa" line={{ stroke: 'rgba(96, 165, 250, 0.45)', strokeWidth: 2 }} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
