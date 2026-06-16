import { describe, expect, it } from 'vitest';

import { DICTA_SUPABASE_AUTH_OPTIONS, getDictaSyncConfig } from '../../src/core/supabaseSync';

describe('supabaseSync config', () => {
  it('treats Supabase URL and anon key as auth-capable even before a profile is resolved', () => {
    const config = getDictaSyncConfig({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      VITE_SUPABASE_SYNC_PROFILE_ID: '',
    });

    expect(config.authRequired).toBe(true);
    expect(config.enabled).toBe(false);
    expect(config.legacyProfileId).toBe('');
  });

  it('lets Supabase consume password recovery links from the current URL', () => {
    expect(DICTA_SUPABASE_AUTH_OPTIONS).toMatchObject({
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    });
  });
});
