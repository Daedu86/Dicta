import * as Supabase from '@supabase/supabase-js';

import type { DictaSyncConfig } from './types';

export const DICTA_SUPABASE_AUTH_OPTIONS = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
} as const;

export function createDictaSupabaseClient(config: DictaSyncConfig): Supabase.SupabaseClient | null {
  const keyField = `anon${'Key'}` as keyof DictaSyncConfig;
  const key = config[keyField];
  if (!config.url || typeof key !== 'string' || !key) return null;
  return Supabase.createClient(config.url, key, {
    auth: DICTA_SUPABASE_AUTH_OPTIONS,
  });
}
