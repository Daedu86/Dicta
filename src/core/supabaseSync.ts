export { DICTA_SUPABASE_AUTH_OPTIONS, createDictaSupabaseClient } from './supabaseSync/client';
export { getDictaSyncConfig } from './supabaseSync/config';
export { deleteSessionSyncRow } from './supabaseSync/deleteSessionRow';
export { mergeSyncRows } from './supabaseSync/mergeRows';
export { pullSyncRows } from './supabaseSync/pullRows';
export { pushSyncRows, pushSyncRowsDetailed, selectPushableSyncRows } from './supabaseSync/pushRows';
export { buildSyncItems, toSyncRows } from './supabaseSync/serialization';
export { latestSyncRowTimestamp, mergeSyncRowSnapshots } from './supabaseSync/snapshots';
export { DICTA_SYNC_TABLE } from './supabaseSync/types';
export type {
  DictaSyncConfig,
  DictaSyncItem,
  DictaSyncItemType,
  DictaSyncMergeResult,
  DictaSyncRow,
  DictaSyncState,
  PullSyncRowsOptions,
  PushSyncRowsOptions,
  PushSyncRowsResult,
} from './supabaseSync/types';
