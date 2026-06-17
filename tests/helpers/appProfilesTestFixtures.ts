import { normalizeDictaAppProfile } from '../../src/core/appProfiles';

export function createAdminProfile(overrides: Record<string, unknown> = {}) {
  return normalizeDictaAppProfile({
    user_id: 'user-1',
    profile_id: 'admin-profile',
    display_name: 'Admin',
    role: 'admin',
    active: true,
    ...overrides,
  });
}

export function createMemberProfile(overrides: Record<string, unknown> = {}) {
  return normalizeDictaAppProfile({
    user_id: 'user-2',
    profile_id: 'mama',
    display_name: 'Mama',
    role: 'member',
    active: true,
    ...overrides,
  });
}
