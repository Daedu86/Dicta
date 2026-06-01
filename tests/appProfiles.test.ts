import { describe, expect, it } from 'vitest';
import {
  canDictaProfileAccessOpenRouter,
  getDictaSessionQuotaStatus,
  normalizeDictaAppProfile,
  resolveEffectiveSyncProfileId,
  resolveOpenRouterAccessState,
} from '../src/core/appProfiles';

describe('appProfiles', () => {
  it('resolves the authenticated active profile before the legacy env profile', () => {
    expect(
      resolveEffectiveSyncProfileId({
        authRequired: true,
        legacyProfileId: 'legacy-admin-profile',
        profile: normalizeDictaAppProfile({
          user_id: 'user-1',
          profile_id: 'admin-profile',
          display_name: 'Admin',
          role: 'admin',
          active: true,
        }),
      }),
    ).toBe('admin-profile');
  });

  it('does not fall back to the legacy profile when Supabase Auth is required and no profile is mapped', () => {
    expect(
      resolveEffectiveSyncProfileId({
        authRequired: true,
        legacyProfileId: 'legacy-admin-profile',
        profile: null,
      }),
    ).toBe('');
  });

  it('preserves legacy single-profile sync when Supabase Auth is not configured', () => {
    expect(
      resolveEffectiveSyncProfileId({
        authRequired: false,
        legacyProfileId: 'legacy-admin-profile',
        profile: null,
      }),
    ).toBe('legacy-admin-profile');
  });

  it('defaults members to no OpenRouter access and a 15-session quota', () => {
    const profile = normalizeDictaAppProfile({
      user_id: 'user-2',
      profile_id: 'mama',
      display_name: 'Mama',
      role: 'member',
      active: true,
    });

    expect(canDictaProfileAccessOpenRouter(profile)).toBe(false);
    expect(profile.assignedOpenRouterModel).toBe(null);
    expect(getDictaSessionQuotaStatus(profile, 14)).toMatchObject({
      limit: 15,
      used: 14,
      remaining: 1,
      blocked: false,
    });
    expect(getDictaSessionQuotaStatus(profile, 15)).toMatchObject({
      limit: 15,
      used: 15,
      remaining: 0,
      blocked: true,
    });
  });

  it('allows admins to use OpenRouter without a session quota', () => {
    const profile = normalizeDictaAppProfile({
      user_id: 'user-1',
      profile_id: 'admin-profile',
      display_name: 'Admin',
      role: 'admin',
      active: true,
      can_access_openrouter: false,
      session_limit: 15,
    });

    expect(canDictaProfileAccessOpenRouter(profile)).toBe(true);
    expect(profile.assignedOpenRouterModel).toBe(null);
    expect(getDictaSessionQuotaStatus(profile, 99)).toMatchObject({
      limit: null,
      used: 99,
      remaining: null,
      blocked: false,
    });
  });

  it('normalizes an assigned member OpenRouter model', () => {
    const profile = normalizeDictaAppProfile({
      user_id: 'user-3',
      profile_id: 'vibo',
      display_name: 'Vibo',
      role: 'member',
      active: true,
      can_access_openrouter: true,
      assigned_openrouter_model: '  meta-llama/llama-3.2-3b-instruct:free  ',
    });

    expect(canDictaProfileAccessOpenRouter(profile)).toBe(true);
    expect(profile.assignedOpenRouterModel).toBe('meta-llama/llama-3.2-3b-instruct:free');
  });

  it('keeps OpenRouter access pending while Supabase auth or app profile is hydrating', () => {
    expect(
      resolveOpenRouterAccessState({
        authRequired: true,
        authLoading: true,
        hasAuthSession: false,
        profile: null,
      }),
    ).toBe('pending');

    expect(
      resolveOpenRouterAccessState({
        authRequired: true,
        authLoading: false,
        hasAuthSession: true,
        profile: null,
      }),
    ).toBe('pending');
  });

  it('allows legacy OpenRouter generation and denies inactive or unauthorized profiles', () => {
    const member = normalizeDictaAppProfile({
      user_id: 'user-2',
      profile_id: 'mama',
      display_name: 'Mama',
      role: 'member',
      active: true,
      can_access_openrouter: false,
    });
    const admin = normalizeDictaAppProfile({
      user_id: 'user-1',
      profile_id: 'admin-profile',
      display_name: 'Admin',
      role: 'admin',
      active: true,
    });

    expect(
      resolveOpenRouterAccessState({
        authRequired: false,
        authLoading: false,
        hasAuthSession: false,
        profile: null,
      }),
    ).toBe('allowed');
    expect(
      resolveOpenRouterAccessState({
        authRequired: true,
        authLoading: false,
        hasAuthSession: true,
        profile: admin,
      }),
    ).toBe('allowed');
    expect(
      resolveOpenRouterAccessState({
        authRequired: true,
        authLoading: false,
        hasAuthSession: true,
        profile: member,
      }),
    ).toBe('denied');
    expect(
      resolveOpenRouterAccessState({
        authRequired: true,
        authLoading: false,
        hasAuthSession: false,
        profile: null,
      }),
    ).toBe('denied');
  });
});
