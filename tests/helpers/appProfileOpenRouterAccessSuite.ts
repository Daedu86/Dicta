import { expect, it } from 'vitest';
import {
  canDictaProfileAccessOpenRouter,
  normalizeDictaAppProfile,
  resolveOpenRouterAccessState,
} from '../../src/core/appProfiles';
import { createAdminProfile, createMemberProfile } from './appProfilesTestFixtures';

export function runAppProfileOpenRouterAccessSuite(): void {
  it('allows a member with an assigned OpenRouter model to access OpenRouter', () => {
    const profile = createMemberProfile({ assigned_openrouter_model: 'openrouter/free' });

    expect(canDictaProfileAccessOpenRouter(profile)).toBe(true);
    expect(profile.assignedOpenRouterModel).toBe('openrouter/free');
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
    const member = createMemberProfile({ can_access_openrouter: false });
    const admin = createAdminProfile();

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
        hasAuthSession: true,
        profile: normalizeDictaAppProfile({
          user_id: 'user-3',
          profile_id: 'assigned-member',
          display_name: 'Assigned',
          role: 'member',
          active: true,
          assigned_openrouter_model: 'openrouter/free',
        }),
      }),
    ).toBe('allowed');
    expect(
      resolveOpenRouterAccessState({
        authRequired: true,
        authLoading: false,
        hasAuthSession: false,
        profile: null,
      }),
    ).toBe('denied');
  });
}
