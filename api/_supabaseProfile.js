import { createClient } from '@supabase/supabase-js';

const PROFILE_TABLE = 'dicta_app_profiles';

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
      if (profileId || !supabaseAuthConfigured) {
        return { profileId: profileId || 'legacy-local', role: 'admin', user: null, profile: null, legacy: true };
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
    .select('user_id,profile_id,display_name,role,active')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || profile.active === false) {
    throw Object.assign(new Error('This Dicta account is not active.'), { statusCode: 403 });
  }

  return {
    profileId: profile.profile_id,
    role: profile.role === 'admin' ? 'admin' : 'member',
    user: userData.user,
    profile,
    legacy: false,
  };
}

export function sendApiError(res, error, fallbackMessage) {
  const status = Number(error?.statusCode);
  res.status(Number.isFinite(status) ? status : 500).send(error instanceof Error ? error.message : fallbackMessage);
}
