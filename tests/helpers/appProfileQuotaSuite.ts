import { expect, it } from 'vitest';
import { canDictaProfileAccessOpenRouter, getDictaSessionQuotaStatus } from '../../src/core/appProfiles';
import { createAdminProfile, createMemberProfile } from './appProfilesTestFixtures';

export function runAppProfileQuotaSuite(): void {
  it('defaults members to no OpenRouter access and a 15-session quota', () => {
    const profile = createMemberProfile();

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
    const profile = createAdminProfile({ can_access_openrouter: false, session_limit: 15 });

    expect(canDictaProfileAccessOpenRouter(profile)).toBe(true);
    expect(profile.assignedOpenRouterModel).toBe(null);
    expect(getDictaSessionQuotaStatus(profile, 99)).toMatchObject({
      limit: null,
      used: 99,
      remaining: null,
      blocked: false,
    });
  });
}
