export function finiteOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function finitePositiveOr(value: number | null | undefined, fallback: number): number {
  const next = finiteOr(value, fallback);
  return next > 0 ? next : fallback;
}

export function clamp01(value: number): number {
  return clamp(finiteOr(value, 0), 0, 1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round2(value: number): number {
  return Number(value.toFixed(2));
}
