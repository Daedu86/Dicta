export function getStringField(value: unknown, field: string): string {
  const record = asRecord(value);
  return typeof record[field] === 'string' ? record[field] : '';
}

export function numberField(value: unknown, field: string): number {
  return numberFrom(asRecord(value)[field]) ?? 0;
}

export function numberFrom(value: unknown): number | null {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function normalizeAccuracy(value: number | null): number | null {
  if (value === null) return null;
  return value <= 1 ? value * 100 : value;
}

export function normalizeNumberArray(primary: unknown, fallback: number[]): number[] {
  if (Array.isArray(primary)) {
    return primary.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  }
  return fallback;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
