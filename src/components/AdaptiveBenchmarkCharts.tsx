import {
  CartesianGrid,
  Bar,
  BarChart,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  RadialBar,
  RadialBarChart,
} from 'recharts';
import type { InputLanguageBenchmarkMetrics } from '../core/adaptive/types';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toPercent(value: number): number {
  return Math.round(clamp01(value) * 1000) / 10;
}

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

type Zone = { lagMin: number; lagMax: number; accuracyMin: number; accuracyMax: number };

function defaultTargetZone(profile: InputLanguageBenchmarkMetrics): Zone {
  // A pragmatic default: target high accuracy + near-zero lag. Tune later per input if needed.
  const accuracyMin = profile.inputMode === 'audio' ? 0.9 : 0.9;
  const accuracyMax = 1;
  const lagMin = -0.6;
  const lagMax = 0.6;
  return { lagMin, lagMax, accuracyMin, accuracyMax };
}

export function TargetZoneChart({
  profile,
  points = 70,
}: {
  profile: InputLanguageBenchmarkMetrics;
  points?: number;
}) {
  const recent = profile.timeline.slice(-points);
  const data = recent.map((point, index) => ({
    i: index,
    lag: Number(point.lagSec.toFixed(3)),
    accuracy: clamp01(point.accuracy),
    mode: point.mode,
    rate: point.playbackRate,
    event: point.event ?? 'rate_change',
  }));

  const zone = defaultTargetZone(profile);
  const lagValues = data.map((d) => d.lag);
  const minLag = Math.min(zone.lagMin - 0.5, ...lagValues, -2.5);
  const maxLag = Math.max(zone.lagMax + 0.5, ...lagValues, 2.5);

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
            contentStyle={{
              borderRadius: 10,
              borderColor: 'rgba(148, 163, 184, 0.38)',
              background: 'rgba(2, 6, 23, 0.92)',
              color: 'rgba(226, 232, 240, 0.92)',
            }}
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

export function MiniTrends({
  profile,
  points = 60,
}: {
  profile: InputLanguageBenchmarkMetrics;
  points?: number;
}) {
  const data = profile.timeline.slice(-points).map((point, index) => ({
    i: index + 1,
    rate: point.playbackRate,
    lag: point.lagSec,
    accuracy: clamp01(point.accuracy) * 100,
  }));
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
            contentStyle={{
              borderRadius: 10,
              borderColor: 'rgba(148, 163, 184, 0.38)',
              background: 'rgba(2, 6, 23, 0.92)',
              color: 'rgba(226, 232, 240, 0.92)',
            }}
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

export function RateAccuracyStrip({ profile }: { profile: InputLanguageBenchmarkMetrics }) {
  const data = profile.rateAccuracyBuckets.map((bucket) => ({
    rate: `${bucket.rate.toFixed(2)}x`,
    accuracy: toPercent(bucket.averageAccuracy),
    lag: Number(bucket.averageLagSec.toFixed(2)),
    samples: bucket.sampleCount,
  }));

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
              contentStyle={{
                borderRadius: 10,
                borderColor: 'rgba(148, 163, 184, 0.38)',
                background: 'rgba(2, 6, 23, 0.92)',
                color: 'rgba(226, 232, 240, 0.92)',
              }}
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

export function LagDistributionChart({ profile }: { profile: InputLanguageBenchmarkMetrics }) {
  const buckets = new Map<string, { label: string; count: number }>();
  const labels = ['<-2s', '-2..-1s', '-1..0s', '0..1s', '1..2s', '>2s'];
  for (const label of labels) buckets.set(label, { label, count: 0 });
  for (const point of profile.timeline.slice(-120)) {
    const lag = point.stableLagSec ?? point.lagSec;
    const label = lag < -2 ? '<-2s' : lag < -1 ? '-2..-1s' : lag < 0 ? '-1..0s' : lag <= 1 ? '0..1s' : lag <= 2 ? '1..2s' : '>2s';
    const bucket = buckets.get(label);
    if (bucket) bucket.count += 1;
  }
  const data = [...buckets.values()];
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
              contentStyle={{
                borderRadius: 10,
                borderColor: 'rgba(148, 163, 184, 0.38)',
                background: 'rgba(2, 6, 23, 0.92)',
                color: 'rgba(226, 232, 240, 0.92)',
              }}
            />
            <Bar dataKey="count" fill="rgba(96, 165, 250, 0.86)" radius={[8, 8, 2, 2]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
