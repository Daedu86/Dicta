import type { SupabaseClient, User } from '@supabase/supabase-js';

export const DICTA_APP_PROFILES_TABLE = 'dicta_app_profiles';

export type DictaAppRole = 'admin' | 'member';

export type DictaAppProfile = {
  userId: string;
  profileId: string;
  displayName: string;
  role: DictaAppRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type DictaAppProfileRow = {
  user_id: string;
  profile_id: string;
  display_name: string | null;
  role: string;
  active: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export function isDictaAdmin(profile: DictaAppProfile | null): boolean {
  return profile?.role === 'admin' && profile.active;
}

export function normalizeDictaAppProfile(row: DictaAppProfileRow): DictaAppProfile {
  return {
    userId: row.user_id,
    profileId: row.profile_id,
    displayName: row.display_name?.trim() || row.profile_id,
    role: row.role === 'admin' ? 'admin' : 'member',
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadDictaAppProfile(client: SupabaseClient, user: User): Promise<DictaAppProfile | null> {
  const { data, error } = await client
    .from(DICTA_APP_PROFILES_TABLE)
    .select('user_id,profile_id,display_name,role,active,created_at,updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeDictaAppProfile(data as DictaAppProfileRow) : null;
}

export async function loadVisibleDictaAppProfiles(client: SupabaseClient): Promise<DictaAppProfile[]> {
  const { data, error } = await client
    .from(DICTA_APP_PROFILES_TABLE)
    .select('user_id,profile_id,display_name,role,active,created_at,updated_at')
    .order('display_name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeDictaAppProfile(row as DictaAppProfileRow));
}

export function resolveEffectiveSyncProfileId(params: {
  authRequired: boolean;
  profile: DictaAppProfile | null;
  legacyProfileId: string;
}): string {
  if (params.profile?.active && params.profile.profileId.trim()) return params.profile.profileId.trim();
  return params.authRequired ? '' : params.legacyProfileId.trim();
}
