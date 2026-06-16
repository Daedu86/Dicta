import { asRecord } from './records';
import type { DictaSyncRow } from './types';

export function timestampFrom(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function compareTimestamp(a: string, b: string): number {
  const aTime = new Date(a).getTime();
  const bTime = new Date(b).getTime();
  return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
}

export function getFeedbackTimestamp(value: unknown): string {
  const record = asRecord(value);
  return timestampFrom(record.completedAt) ?? timestampFrom(record.createdAt) ?? new Date(0).toISOString();
}

export function latestSyncRowTimestamp(rows: DictaSyncRow[]): string | null {
  let latest: string | null = null;
  for (const row of rows) {
    const timestamp = timestampFrom(row.updated_at);
    if (!timestamp) continue;
    if (!latest || compareTimestamp(timestamp, latest) > 0) {
      latest = timestamp;
    }
  }
  return latest;
}
