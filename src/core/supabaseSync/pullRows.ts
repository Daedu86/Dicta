import type { SupabaseClient } from '@supabase/supabase-js';

import { timestampFrom } from './timestamps';
import { DICTA_SYNC_TABLE, type DictaSyncRow, type PullSyncRowsOptions } from './types';

export async function pullSyncRows(client: SupabaseClient, profileId: string, options: PullSyncRowsOptions = {}): Promise<DictaSyncRow[]> {
  let query = client
    .from(DICTA_SYNC_TABLE)
    .select('profile_id,item_type,item_key,payload,updated_at')
    .eq('profile_id', profileId);

  const updatedAfter = timestampFrom(options.updatedAfter);
  if (updatedAfter) {
    query = query.gt('updated_at', updatedAfter);
  }

  const { data, error } = await query.order('updated_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DictaSyncRow[];
}
