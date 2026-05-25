import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveRequestProfile } from '../api/_supabaseProfile.js';

describe('server Supabase profile resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not allow the legacy env profile to bypass Supabase Auth', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('VITE_SUPABASE_SYNC_PROFILE_ID', 'legacy-admin-profile');

    await expect(resolveRequestProfile({ headers: {} }, { allowLegacyEnvProfile: true })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sign in to Dicta before using this endpoint.',
    });
  });

  it('preserves legacy local profile mode when Supabase Auth is not configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_SYNC_PROFILE_ID', 'legacy-admin-profile');

    await expect(resolveRequestProfile({ headers: {} }, { allowLegacyEnvProfile: true })).resolves.toMatchObject({
      profileId: 'legacy-admin-profile',
      role: 'admin',
      canAccessOpenRouter: true,
      legacy: true,
    });
  });
});
