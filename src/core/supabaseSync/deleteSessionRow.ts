import type { SupabaseClient } from '@supabase/supabase-js';

import { getTombstoneExpiresAt } from './syncRetentionPolicy';
import { DICTA_SYNC_TABLE, type DictaSyncRow } from './types';

export async function deleteSessionSyncRow(client: SupabaseClient, profileId: string, sessionId: string): Promise<DictaSyncRow> {
  const deletedAt = new Date().toISOString();
  const tombstoneExpiresAt = getTombstoneExpiresAt(deletedAt);
  const row: DictaSyncRow = {
    profile_id: profileId,
    item_type: 'session',
    item_key: sessionId,
    payload: {
      id: sessionId,
      deleted: true,
      deletedAt,
      tombstoneExpiresAt,
      updatedAt: deletedAt,
    },
    updated_at: deletedAt,
  };
  const { error } = await client.from(DICTA_SYNC_TABLE).upsert(row, {
    onConflict: 'profile_id,item_type,item_key',
  });
  if (error) throw error;
  return row;
}
