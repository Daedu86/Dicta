export type UnknownRecord = Record<string, unknown>;

export function numberOr(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function stringOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function safeLength(value: unknown): number {
  return typeof value === 'string' ? value.length : 0;
}

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

export function normalizeTrend(value: unknown): 'improving' | 'stable' | 'declining' {
  return value === 'improving' || value === 'declining' || value === 'stable' ? value : 'stable';
}

export function hasNonEmptyText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
