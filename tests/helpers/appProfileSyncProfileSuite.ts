import { expect, it } from 'vitest';
import { normalizeDictaAppProfile, resolveEffectiveSyncProfileId } from '../../src/core/appProfiles';

export function runAppProfileSyncProfileSuite(): void {
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
}
