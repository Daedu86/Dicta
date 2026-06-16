import { compareTimestamp, latestSyncRowTimestamp } from './timestamps';
import { isValidSyncRow, syncRowIdentity } from './rowValidation';
import type { DictaSyncRow } from './types';

export { latestSyncRowTimestamp } from './timestamps';

export function mergeSyncRowSnapshots(currentRows: DictaSyncRow[], changedRows: DictaSyncRow[]): DictaSyncRow[] {
  if (changedRows.length === 0) return currentRows;
  const byKey = new Map<string, DictaSyncRow>();
  for (const row of currentRows) {
    if (!isValidSyncRow(row)) continue;
    byKey.set(syncRowIdentity(row), row);
  }
  for (const row of changedRows) {
    if (!isValidSyncRow(row)) continue;
    byKey.set(syncRowIdentity(row), row);
  }
  return [...byKey.values()].sort((a, b) => compareTimestamp(a.updated_at, b.updated_at));
}
