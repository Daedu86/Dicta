import type { SupabaseClient } from '@supabase/supabase-js';

import { timestampFrom } from './timestamps';
import { DICTA_SYNC_TABLE, type DictaSyncRow, type PullSyncRowsOptions } from './types';

const SUPABASE_PULL_PAGE_SIZE = 1000;

export async function pullSyncRows(client: SupabaseClient, profileId: string, options: PullSyncRowsOptions = {}): Promise<DictaSyncRow[]> {
  const updatedAfter = timestampFrom(options.updatedAfter);
  const rows: DictaSyncRow[] = [];
  let offset = 0;

  while (true) {
    let query = client
      .from(DICTA_SYNC_TABLE)
      .select('profile_id,item_type,item_key,payload,updated_at')
      .eq('profile_id', profileId);

    if (updatedAfter) {
      query = query.gt('updated_at', updatedAfter);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: true })
      .order('item_type', { ascending: true })
      .order('item_key', { ascending: true })
      .range(offset, offset + SUPABASE_PULL_PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as DictaSyncRow[];
    rows.push(...page);

    if (page.length < SUPABASE_PULL_PAGE_SIZE) break;
    offset += SUPABASE_PULL_PAGE_SIZE;
  }

  return rows;
}
