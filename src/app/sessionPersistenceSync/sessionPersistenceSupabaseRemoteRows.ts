import {
  latestSyncRowTimestamp,
  mergeSyncRowSnapshots,
  type DictaSyncRow,
} from '../../core/supabaseSync';
import type { SupabaseRemoteRowsRefs } from './sessionPersistenceSupabasePushTypes';

export function mergeSupabaseRemoteRows(
  { supabaseKnownRemoteRowsRef, supabaseLastRemoteUpdatedAtRef }: SupabaseRemoteRowsRefs,
  rows: DictaSyncRow[],
): void {
  supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, rows);
  supabaseLastRemoteUpdatedAtRef.current =
    latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
}
