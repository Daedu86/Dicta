export const DICTA_SYNC_TABLE = 'dicta_sync_items';

export type DictaSyncItemType = 'session' | 'benchmark' | 'feedback';

export type DictaSyncRow = {
  profile_id: string;
  item_type: DictaSyncItemType;
  item_key: string;
  payload: unknown;
  updated_at: string;
};

export type DictaSyncItem = {
  itemType: DictaSyncItemType;
  itemKey: string;
  payload: unknown;
  updatedAt: string;
};

export type DictaSyncConfig = {
  enabled: boolean;
  authRequired: boolean;
  url: string;
  anonKey: string;
  profileId: string;
  legacyProfileId: string;
};

export type DictaSyncState = {
  sessions: unknown[];
  benchmarks: Record<string, Record<string, unknown>>;
  feedback: Record<string, Record<string, unknown[]>>;
};

export type DictaSyncMergeResult = DictaSyncState & {
  changed: boolean;
  imported: number;
  skipped: number;
  deletedSessionIds: string[];
};

export type PullSyncRowsOptions = {
  updatedAfter?: string | null;
};

export type PushSyncRowsResult = {
  pushed: number;
  pushedRows: DictaSyncRow[];
};

export type PushSyncRowsOptions = {
  existingRows?: DictaSyncRow[] | null;
};
