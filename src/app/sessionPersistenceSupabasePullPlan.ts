import type { DictaSyncRow } from '../core/supabaseSync';
import { isTransientGenerationErrorSessionLike } from '../core/adaptive/openRouterFallbackScript';

export type SupabasePullReason = 'initial' | 'background';

export const SUPABASE_FULL_PULL_INTERVAL_MS = 60 * 60_000;

export function shouldUseFullSupabasePull(
  reason: SupabasePullReason,
  nowMs: number,
  lastFullPullAtMs: number,
): boolean {
  return reason === 'initial' || nowMs - lastFullPullAtMs > SUPABASE_FULL_PULL_INTERVAL_MS;
}

export function collectTransientErrorSessionIds(rows: DictaSyncRow[]): string[] {
  return rows
    .filter((row) => row.item_type === 'session' && isTransientGenerationErrorSessionLike(row.payload))
    .map((row) => row.item_key);
}
