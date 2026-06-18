import type { SupabaseClient } from '@supabase/supabase-js';

import { timestampFrom } from './timestamps';
import { DICTA_SYNC_TABLE, type DictaSyncRow, type PullSyncRowsOptions } from './types';

const SUPABASE_PULL_PAGE_SIZE = 1000;

export async function pullSyncRows(client: SupabaseClient, profileId: string, options: PullSyncRowsOptions = {}): Promise<DictaSyncRow[]> {
  const updatedAfter = timestampFrom(options.updatedAfter);
  const serverVersionAfter = typeof options.serverVersionAfter === 'number' ? options.serverVersionAfter : null;
  const rows: DictaSyncRow[] = [];
  let offset = 0;

  while (true) {
    let query = client
      .from(DICTA_SYNC_TABLE)
      .select('profile_id,item_type,item_key,payload,updated_at,server_version')
      .eq('profile_id', profileId);

    if (serverVersionAfter !== null) {
      query = query.gt('server_version', serverVersionAfter);
    } else if (updatedAfter) {
      query = query.gt('updated_at', updatedAfter);
    }

    let orderedQuery = query.order(serverVersionAfter !== null ? 'server_version' : 'updated_at', { ascending: true });
    if (serverVersionAfter !== null) {
      orderedQuery = orderedQuery.order('updated_at', { ascending: true });
    }

    const { data, error } = await orderedQuery
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
