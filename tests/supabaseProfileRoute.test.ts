import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { assertOpenRouterModelAllowed, resolveRequestProfile } from '../api/_supabaseProfile.js';

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

    await expect(resolveRequestProfile({ headers: { host: 'localhost:5173' } }, { allowLegacyEnvProfile: true })).resolves.toMatchObject({
      profileId: 'legacy-admin-profile',
      role: 'admin',
      canAccessOpenRouter: true,
      legacy: true,
    });
  });

  it('does not allow hosted legacy OpenRouter access without Supabase Auth or an app password session', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_SYNC_PROFILE_ID', 'legacy-admin-profile');
    vi.stubEnv('DICTA_APP_PASSWORD', '');

    await expect(resolveRequestProfile({ headers: { host: 'dicta.example' } }, { allowLegacyEnvProfile: true })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sign in to Dicta before using this endpoint.',
    });
  });

  it('does not trust a localhost Host header for legacy mode in production', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_SYNC_PROFILE_ID', 'legacy-admin-profile');
    vi.stubEnv('DICTA_APP_PASSWORD', '');
    vi.stubEnv('NODE_ENV', 'production');

    await expect(resolveRequestProfile({ headers: { host: 'localhost:3000' } }, { allowLegacyEnvProfile: true })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sign in to Dicta before using this endpoint.',
    });
  });

  it('allows hosted legacy mode only with a valid app password cookie', async () => {
    const password = 'correct horse battery staple';
    const cookieHash = createHash('sha256').update(password).digest('hex');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_SYNC_PROFILE_ID', 'legacy-admin-profile');
    vi.stubEnv('DICTA_APP_PASSWORD', password);

    await expect(
      resolveRequestProfile(
        {
          headers: {
            host: 'dicta.example',
            cookie: `dicta_auth=${encodeURIComponent(cookieHash)}`,
          },
        },
        { allowLegacyEnvProfile: true },
      ),
    ).resolves.toMatchObject({
      profileId: 'legacy-admin-profile',
      role: 'admin',
      canAccessOpenRouter: true,
      legacy: true,
    });

    await expect(
      resolveRequestProfile({ headers: { host: 'dicta.example', cookie: 'dicta_auth=wrong' } }, { allowLegacyEnvProfile: true }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sign in to Dicta before using this endpoint.',
    });
  });

  it('enforces assigned OpenRouter models for member profiles only', () => {
    const member = {
      role: 'member',
      assignedOpenRouterModel: 'openrouter/free',
      legacy: false,
    };

    expect(() => assertOpenRouterModelAllowed(member, 'openrouter/free')).not.toThrow();
    expect(() => assertOpenRouterModelAllowed(member, 'meta-llama/llama-3.2-3b-instruct:free')).toThrow(
      'assigned to OpenRouter model "openrouter/free"',
    );
    expect(() =>
      assertOpenRouterModelAllowed({ ...member, role: 'admin' }, 'meta-llama/llama-3.2-3b-instruct:free'),
    ).not.toThrow();
    expect(() =>
      assertOpenRouterModelAllowed({ ...member, legacy: true }, 'meta-llama/llama-3.2-3b-instruct:free'),
    ).not.toThrow();
  });
});
