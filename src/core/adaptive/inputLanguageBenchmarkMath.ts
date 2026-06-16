export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizeAccuracy(value: number): number {
  return value > 1 ? clamp01(value / 100) : clamp01(value);
}

export function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

export function runningAverage(currentAverage: number, nextValue: number, previousCount: number): number {
  return (currentAverage * previousCount + nextValue) / Math.max(1, previousCount + 1);
}

export function computeVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  return average(values.map((value) => (value - mean) ** 2));
}
