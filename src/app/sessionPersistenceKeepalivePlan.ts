import {
  DICTA_SYNC_TABLE,
  selectPushableSyncRows,
  type DictaSyncConfig,
  type DictaSyncRow,
} from '../core/supabaseSync';

export const SUPABASE_KEEPALIVE_BODY_MAX_BYTES = 60_000;

type KeepaliveSyncConfig = Pick<DictaSyncConfig, 'enabled' | 'url' | 'anonKey'>;

export type PendingCriticalSessionRowsKeepalivePlan = {
  endpoint: string;
  headers: Record<string, string>;
  body: string;
  rows: DictaSyncRow[];
};

export type PendingCriticalSessionRowsKeepalivePlanResult = {
  plan: PendingCriticalSessionRowsKeepalivePlan | null;
  clearPendingRows: boolean;
};

type BuildPendingCriticalSessionRowsKeepalivePlanOptions = {
  syncConfig: KeepaliveSyncConfig;
  accessToken: string;
  pendingRows: DictaSyncRow[];
  knownRemoteRows: DictaSyncRow[];
};

export function buildPendingCriticalSessionRowsKeepalivePlan({
  syncConfig,
  accessToken,
  pendingRows,
  knownRemoteRows,
}: BuildPendingCriticalSessionRowsKeepalivePlanOptions): PendingCriticalSessionRowsKeepalivePlanResult {
  if (!syncConfig.enabled || pendingRows.length === 0) return noKeepalivePlan();
  if (!syncConfig.url || !syncConfig.anonKey || !accessToken) return noKeepalivePlan();

  const rows = selectPushableSyncRows(pendingRows, knownRemoteRows);
  if (rows.length === 0) {
    return { plan: null, clearPendingRows: true };
  }

  const body = JSON.stringify(rows);
  if (byteSize(body) > SUPABASE_KEEPALIVE_BODY_MAX_BYTES) return noKeepalivePlan();

  return {
    plan: {
      endpoint: `${syncConfig.url.replace(/\/+$/, '')}/rest/v1/${DICTA_SYNC_TABLE}?on_conflict=profile_id,item_type,item_key`,
      headers: {
        apikey: syncConfig.anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body,
      rows,
    },
    clearPendingRows: false,
  };
}

function noKeepalivePlan(): PendingCriticalSessionRowsKeepalivePlanResult {
  return { plan: null, clearPendingRows: false };
}

function byteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}
