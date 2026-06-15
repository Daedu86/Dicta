import {
  buildSyncItems,
  mergeSyncRowSnapshots,
  toSyncRows,
  type DictaSyncRow,
  type DictaSyncState,
} from '../core/supabaseSync';

export function clearPendingCriticalSessionRowsSnapshot(
  pendingRows: DictaSyncRow[],
  sessionIds: string[],
): DictaSyncRow[] {
  if (sessionIds.length === 0 || pendingRows.length === 0) return pendingRows;
  const ids = new Set(sessionIds);
  return pendingRows.filter((row) => row.item_type !== 'session' || !ids.has(row.item_key));
}

type RememberPendingCriticalSessionRowsOptions = {
  enabled: boolean;
  profileId: string;
  existingRows: DictaSyncRow[];
  syncState: DictaSyncState;
  sessionIds: string[];
};

export function rememberPendingCriticalSessionRowsSnapshot({
  enabled,
  profileId,
  existingRows,
  syncState,
  sessionIds,
}: RememberPendingCriticalSessionRowsOptions): DictaSyncRow[] {
  if (!enabled || sessionIds.length === 0) return existingRows;
  const ids = new Set(sessionIds.filter(Boolean));
  if (ids.size === 0) return existingRows;

  const rows = toSyncRows(profileId, buildSyncItems(syncState)).filter(
    (row) => row.item_type === 'session' && ids.has(row.item_key),
  );
  return mergeSyncRowSnapshots(existingRows, rows);
}
