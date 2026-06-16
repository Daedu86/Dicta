import type { SupabaseClient } from '@supabase/supabase-js';

import { collectCompletedFeedbackEvidence } from './feedbackEvidence';
import { pullSyncRows } from './pullRows';
import { isValidSyncRow, syncRowIdentity } from './rowValidation';
import {
  isSubmittedFinishedSession,
  localSubmittedSessionOutranksRemote,
  remoteSubmittedSessionOutranksLocal,
  shouldLocalRowReplaceRemoteTombstone,
} from './sessionConflictPolicy';
import { isSessionTombstonePayload } from './sessionTombstones';
import { buildSyncItems, toSyncRows } from './serialization';
import { compareTimestamp } from './timestamps';
import { DICTA_SYNC_TABLE, type DictaSyncRow, type DictaSyncState, type PushSyncRowsOptions, type PushSyncRowsResult } from './types';

export async function pushSyncRows(client: SupabaseClient, profileId: string, state: DictaSyncState, options: PushSyncRowsOptions = {}): Promise<number> {
  const result = await pushSyncRowsDetailed(client, profileId, state, options);
  return result.pushed;
}

export async function pushSyncRowsDetailed(
  client: SupabaseClient,
  profileId: string,
  state: DictaSyncState,
  options: PushSyncRowsOptions = {},
): Promise<PushSyncRowsResult> {
  const rows = toSyncRows(profileId, buildSyncItems(state));
  if (rows.length === 0) return { pushed: 0, pushedRows: [] };
  const existingRows = options.existingRows ?? (await pullSyncRows(client, profileId));
  const pushableRows = selectPushableSyncRows(rows, existingRows);
  if (pushableRows.length === 0) return { pushed: 0, pushedRows: [] };
  const { error } = await client.from(DICTA_SYNC_TABLE).upsert(pushableRows, {
    onConflict: 'profile_id,item_type,item_key',
  });
  if (error) throw error;
  return { pushed: pushableRows.length, pushedRows: pushableRows };
}

export function selectPushableSyncRows(localRows: DictaSyncRow[], remoteRows: DictaSyncRow[]): DictaSyncRow[] {
  const remoteByKey = new Map<string, DictaSyncRow>();
  const completedFeedbackBySessionId = collectCompletedFeedbackEvidence(remoteRows);
  for (const row of remoteRows) {
    if (!isValidSyncRow(row)) continue;
    remoteByKey.set(syncRowIdentity(row), row);
  }

  return localRows.filter((localRow) => {
    if (!isValidSyncRow(localRow)) return false;
    if (
      localRow.item_type === 'session' &&
      completedFeedbackBySessionId.has(localRow.item_key) &&
      !isSubmittedFinishedSession(localRow.payload)
    ) {
      return false;
    }
    const remoteRow = remoteByKey.get(syncRowIdentity(localRow));
    if (!remoteRow) return true;
    if (localRow.item_type === 'session' && isSessionTombstonePayload(remoteRow.payload)) {
      return shouldLocalRowReplaceRemoteTombstone(localRow, remoteRow);
    }
    if (localRow.item_type === 'session' && localSubmittedSessionOutranksRemote(localRow.payload, remoteRow.payload)) {
      return true;
    }
    if (localRow.item_type === 'session' && remoteSubmittedSessionOutranksLocal(remoteRow.payload, localRow.payload)) {
      return false;
    }
    return compareTimestamp(localRow.updated_at, remoteRow.updated_at) > 0;
  });
}
