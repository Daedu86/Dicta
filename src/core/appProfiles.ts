import type { SupabaseClient, User } from '@supabase/supabase-js';

export const DICTA_APP_PROFILES_TABLE = 'dicta_app_profiles';
export const DEFAULT_MEMBER_SESSION_LIMIT = 15;

export type DictaAppRole = 'admin' | 'member';

export type DictaAppProfile = {
  userId: string;
  profileId: string;
  displayName: string;
  role: DictaAppRole;
  active: boolean;
  canAccessOpenRouter: boolean;
  assignedOpenRouterModel: string | null;
  sessionLimit: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type DictaAppProfileRow = {
  user_id: string;
  profile_id: string;
  display_name: string | null;
  role: string;
  active: boolean | null;
  can_access_openrouter?: boolean | null;
  assigned_openrouter_model?: string | null;
  session_limit?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type DictaSessionQuotaStatus = {
  limit: number | null;
  used: number;
  remaining: number | null;
  blocked: boolean;
  message: string;
};

export type OpenRouterAccessState = 'pending' | 'allowed' | 'denied';

export function isDictaAdmin(profile: DictaAppProfile | null): boolean {
  return profile?.role === 'admin' && profile.active;
}

export function canDictaProfileAccessOpenRouter(profile: DictaAppProfile | null): boolean {
  return Boolean(profile?.active && (profile.role === 'admin' || profile.canAccessOpenRouter || profile.assignedOpenRouterModel));
}

export function resolveOpenRouterAccessState({
  authRequired,
  authLoading,
  hasAuthSession,
  profile,
  profileError,
}: {
  authRequired: boolean;
  authLoading: boolean;
  hasAuthSession: boolean;
  profile: DictaAppProfile | null;
  profileError?: string;
}): OpenRouterAccessState {
  if (!authRequired) return 'allowed';
  if (authLoading) return 'pending';
  if (!hasAuthSession) return 'denied';
  if (!profile && !profileError) return 'pending';
  return canDictaProfileAccessOpenRouter(profile) ? 'allowed' : 'denied';
}

export function getDictaSessionLimit(profile: DictaAppProfile | null): number | null {
  if (!profile || profile.role === 'admin') return null;
  return normalizeSessionLimit(profile.sessionLimit, profile.role);
}

export function getDictaSessionQuotaStatus(profile: DictaAppProfile | null, sessionCount: number): DictaSessionQuotaStatus {
  const used = Math.max(0, Math.floor(sessionCount));
  const limit = getDictaSessionLimit(profile);
  if (limit === null) {
    return { limit, used, remaining: null, blocked: false, message: '' };
  }
  const remaining = Math.max(0, limit - used);
  const blocked = used >= limit;
  return {
    limit,
    used,
    remaining,
    blocked,
    message: blocked
      ? `Session limit reached (${used}/${limit}). Contact the admin to unlock more dictation sessions.`
      : '',
  };
}

export function normalizeDictaAppProfile(row: DictaAppProfileRow): DictaAppProfile {
  const role: DictaAppRole = row.role === 'admin' ? 'admin' : 'member';
  return {
    userId: row.user_id,
    profileId: row.profile_id,
    displayName: row.display_name?.trim() || row.profile_id,
    role,
    active: row.active !== false,
    canAccessOpenRouter: role === 'admin' || row.can_access_openrouter === true || Boolean(normalizeAssignedOpenRouterModel(row.assigned_openrouter_model)),
    assignedOpenRouterModel: normalizeAssignedOpenRouterModel(row.assigned_openrouter_model),
    sessionLimit: normalizeSessionLimit(row.session_limit, role),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSessionLimit(value: unknown, role: DictaAppRole): number | null {
  if (value === null || value === undefined) {
    return role === 'admin' ? null : DEFAULT_MEMBER_SESSION_LIMIT;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.floor(numeric);
  }
  return role === 'admin' ? null : DEFAULT_MEMBER_SESSION_LIMIT;
}

function normalizeAssignedOpenRouterModel(value: unknown): string | null {
  const model = typeof value === 'string' ? value.trim() : '';
  return model || null;
}

export async function loadDictaAppProfile(client: SupabaseClient, user: User): Promise<DictaAppProfile | null> {
  const { data, error } = await client
    .from(DICTA_APP_PROFILES_TABLE)
    .select('user_id,profile_id,display_name,role,active,can_access_openrouter,assigned_openrouter_model,session_limit,created_at,updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeDictaAppProfile(data as DictaAppProfileRow) : null;
}

export async function loadVisibleDictaAppProfiles(client: SupabaseClient): Promise<DictaAppProfile[]> {
  const { data, error } = await client
    .from(DICTA_APP_PROFILES_TABLE)
    .select('user_id,profile_id,display_name,role,active,can_access_openrouter,assigned_openrouter_model,session_limit,created_at,updated_at')
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
