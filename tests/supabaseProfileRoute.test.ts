import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertOpenRouterModelAllowed, resolveRequestProfile } from '../api/_supabaseProfile.js';

describe('server Supabase profile resolution', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires a signed Supabase bearer session for server routes', async () => {
    await expect(resolveRequestProfile({ headers: {} })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sign in to Dicta before using this endpoint.',
    });
  });

  it('does not accept legacy profile bypass options', async () => {
    vi.stubEnv('VITE_SUPABASE_SYNC_PROFILE_ID', 'old-admin-profile');

    await expect(resolveRequestProfile({ headers: { host: 'localhost:5173' } })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Sign in to Dicta before using this endpoint.',
    });
  });

  it('enforces assigned OpenRouter models for member profiles only', () => {
    const member = {
      role: 'member',
      assignedOpenRouterModel: 'openrouter/free',
    };

    expect(() => assertOpenRouterModelAllowed(member, 'openrouter/free')).not.toThrow();
    expect(() => assertOpenRouterModelAllowed(member, 'meta-llama/llama-3.2-3b-instruct:free')).toThrow(
      'assigned to OpenRouter model "openrouter/free"',
    );
    expect(() =>
      assertOpenRouterModelAllowed({ ...member, role: 'admin' }, 'meta-llama/llama-3.2-3b-instruct:free'),
    ).not.toThrow();
  });
});
