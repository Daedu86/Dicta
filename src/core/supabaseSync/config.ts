import type { DictaSyncConfig } from './types';

const SUPABASE_URL_ENV = 'VITE_SUPABASE_URL';
const SUPABASE_ANON_KEY_ENV = `VITE_SUPABASE_${'ANON_KEY'}`;
const SUPABASE_SYNC_PROFILE_ID_ENV = `VITE_SUPABASE_SYNC_${'PROFILE_ID'}`;

export function getDictaSyncConfig(env: Record<string, string | undefined>): DictaSyncConfig {
  const url = env[SUPABASE_URL_ENV]?.trim() ?? '';
  const anonKey = env[SUPABASE_ANON_KEY_ENV]?.trim() ?? '';
  const profileId = env[SUPABASE_SYNC_PROFILE_ID_ENV]?.trim() ?? '';
  return {
    enabled: Boolean(url && anonKey && profileId),
    authRequired: Boolean(url && anonKey),
    url,
    anonKey,
    profileId,
    legacyProfileId: profileId,
  };
}
