import type { DictaSyncConfig } from '../../src/core/supabaseSync';

export const disabledSyncConfig: DictaSyncConfig = {
  enabled: false,
  authRequired: false,
  url: '',
  anonKey: '',
  profileId: '',
  legacyProfileId: '',
};

export const authSyncConfig: DictaSyncConfig = {
  enabled: false,
  authRequired: true,
  url: 'https://example.supabase.co',
  anonKey: 'anon-key',
  profileId: '',
  legacyProfileId: '',
};
