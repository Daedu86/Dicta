import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { normalizeOpenRouterModelId } from './openrouter/_request.js';

const AUTH_COOKIE = 'dicta_auth';
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

export async function resolveRequestProfile(req, options = {}) {
  const authorization = req.headers.authorization || req.headers.Authorization || '';
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  const supabaseAuthConfigured = Boolean(getEnv('VITE_SUPABASE_URL') && getEnv('VITE_SUPABASE_ANON_KEY'));

  if (!token) {
    if (options.allowLegacyEnvProfile) {
      const profileId = getEnv('VITE_SUPABASE_SYNC_PROFILE_ID');
      if (!supabaseAuthConfigured && legacyEnvProfileAllowed(req)) {
        return {
          profileId: profileId || 'legacy-local',
          role: 'admin',
          user: null,
          profile: null,
          canAccessOpenRouter: true,
          assignedOpenRouterModel: '',
          sessionLimit: null,
          legacy: true,
        };
      }
    }
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
    legacy: false,
  };
}

export function assertOpenRouterAccess(requester) {
  if (requester?.role === 'admin' || requester?.canAccessOpenRouter === true) return;
  throw Object.assign(new Error('OpenRouter access is disabled for this Dicta account. Contact the admin.'), { statusCode: 403 });
}

export function assertOpenRouterModelAllowed(requester, requestedModel) {
  if (requester?.legacy || requester?.role === 'admin') return;
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

function legacyEnvProfileAllowed(req) {
  if (isLocalHostRequest(req)) return true;

  const password = getEnv('DICTA_APP_PASSWORD');
  if (!password) return false;

  return getCookie(req, AUTH_COOKIE) === hashPassword(password);
}

function isLocalHostRequest(req) {
  if (getEnv('VERCEL') || getEnv('VERCEL_ENV') || getEnv('NODE_ENV') === 'production') return false;
  const rawHost = getHeader(req, 'host') || getHeader(req, 'x-forwarded-host');
  const host = normalizeHostName(rawHost);
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost');
}

function normalizeHostName(rawHost) {
  const host = rawHost.split(',')[0].trim().toLowerCase();
  if (!host) return '';
  if (host === '::1') return host;
  if (host.startsWith('[')) {
    const closeIndex = host.indexOf(']');
    return closeIndex > 0 ? host.slice(1, closeIndex) : '';
  }
  return host.split(':')[0];
}

function getCookie(req, name) {
  const cookie = getHeader(req, 'cookie');
  const pairs = cookie.split(';').map((part) => part.trim());
  const match = pairs.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

function getHeader(req, name) {
  const headers = req?.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    return headers.get(name) ?? '';
  }
  const direct = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  if (Array.isArray(direct)) return direct[0] ?? '';
  return typeof direct === 'string' ? direct : '';
}

function hashPassword(value) {
  return createHash('sha256').update(value).digest('hex');
}
