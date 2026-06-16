import { asRecord, isRecord } from './records';
import { compareTimestamp, timestampFrom } from './timestamps';
import type { DictaSyncRow } from './types';

export function isValidSyncRow(row: DictaSyncRow): boolean {
  return (
    typeof row.profile_id === 'string' &&
    (row.item_type === 'session' || row.item_type === 'benchmark' || row.item_type === 'feedback') &&
    typeof row.item_key === 'string' &&
    row.item_key.length > 0 &&
    isRecord(row.payload) &&
    Boolean(timestampFrom(row.updated_at))
  );
}

export function isRemoteNewer(row: DictaSyncRow, localPayload: unknown, localFields: string[]): boolean {
  const localRecord = asRecord(localPayload);
  const localTimestamp =
    localFields.map((field) => timestampFrom(localRecord[field])).find((value): value is string => Boolean(value)) ?? new Date(0).toISOString();
  return compareTimestamp(row.updated_at, localTimestamp) > 0;
}

export function syncRowIdentity(row: DictaSyncRow): string {
  return `${row.profile_id}:${row.item_type}:${row.item_key}`;
}

export function splitBenchmarkKey(key: string): [string, string] {
  const parts = key.split(':');
  return parts.length === 2 ? [parts[0], parts[1]] : ['', ''];
}
