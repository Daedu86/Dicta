import { createClient } from '@supabase/supabase-js';
import { normalizeOpenRouterModelId } from './openrouter/_request.js';

const PROFILE_TABLE = 'dicta_app_profiles';
const DEFAULT_MEMBER_SESSION_LIMIT = 15;

function getEnv(name) {
  return process.env[name]?.trim() ?? '';
}

export function createSupabaseServiceClient() {
  const url = getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function resolveRequestProfile(req) {
  const authorization = req.headers.authorization || req.headers.Authorization || '';
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';

  if (!token) {
    throw Object.assign(new Error('Sign in to Dicta before using this endpoint.'), { statusCode: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    throw Object.assign(new Error('Invalid Dicta session.'), { statusCode: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from(PROFILE_TABLE)
    .select('user_id,profile_id,display_name,role,active,can_access_openrouter,assigned_openrouter_model,session_limit')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.active === false) {
    throw Object.assign(new Error('This Dicta account is not active.'), { statusCode: 403 });
  }

  const role = profile.role === 'admin' ? 'admin' : 'member';

  return {
    profileId: profile.profile_id,
    role,
    user: userData.user,
    profile,
    canAccessOpenRouter: role === 'admin' || profile.can_access_openrouter === true,
    assignedOpenRouterModel: normalizeAssignedOpenRouterModel(profile.assigned_openrouter_model),
    sessionLimit: role === 'admin' ? null : normalizeMemberSessionLimit(profile.session_limit),
  };
}

export function assertOpenRouterAccess(requester) {
  if (requester?.role === 'admin' || requester?.canAccessOpenRouter === true) return;
  throw Object.assign(new Error('OpenRouter access is disabled for this Dicta account. Contact the admin.'), { statusCode: 403 });
}

export function assertOpenRouterModelAllowed(requester, requestedModel) {
  if (requester?.role === 'admin') return;
  const assignedModel = normalizeAssignedOpenRouterModel(requester?.assignedOpenRouterModel);
  if (!assignedModel) return;
  if (requestedModel === assignedModel) return;
  throw Object.assign(new Error(`This Dicta account is assigned to OpenRouter model "${assignedModel}". Contact the admin to change it.`), {
    statusCode: 403,
  });
}

export function sendApiError(res, error, fallbackMessage) {
  const status = Number(error?.statusCode);
  res.status(Number.isFinite(status) ? status : 500).send(error instanceof Error ? error.message : fallbackMessage);
}

function normalizeAssignedOpenRouterModel(value) {
  try {
    return normalizeOpenRouterModelId(value);
  } catch {
    return '';
  }
}

function normalizeMemberSessionLimit(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return Math.floor(numeric);
  return DEFAULT_MEMBER_SESSION_LIMIT;
}
