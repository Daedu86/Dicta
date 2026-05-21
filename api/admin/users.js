import { createSupabaseServiceClient, resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';

const DEFAULT_MEMBER_SESSION_LIMIT = 15;

function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return {};
    }
  }
  return body;
}

function slugProfileId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeMemberSessionLimit(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return Math.floor(numeric);
  return DEFAULT_MEMBER_SESSION_LIMIT;
}

function profileSelect() {
  return 'user_id,profile_id,display_name,role,active,can_access_openrouter,session_limit,created_at,updated_at';
}

export default async function handler(req, res) {
  try {
    const requester = await resolveRequestProfile(req);
    if (requester.role !== 'admin') {
      res.status(403).send('Admin access required.');
      return;
    }

    const supabase = createSupabaseServiceClient();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('dicta_app_profiles')
        .select(profileSelect())
        .order('display_name', { ascending: true });
      if (error) throw error;
      res.status(200).json({ profiles: data ?? [] });
      return;
    }

    if (req.method === 'POST') {
      const body = normalizeBody(req.body);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
      const requestedProfileId = typeof body.profileId === 'string' ? slugProfileId(body.profileId) : '';
      const role = body.role === 'admin' ? 'admin' : 'member';
      const canAccessOpenRouter =
        role === 'admin' ? true : typeof body.canAccessOpenRouter === 'boolean' ? body.canAccessOpenRouter : false;
      const sessionLimit = role === 'admin' ? null : normalizeMemberSessionLimit(body.sessionLimit);

      if (!email || !email.includes('@')) {
        res.status(400).send('Valid email is required.');
        return;
      }
      if (password.length < 8) {
        res.status(400).send('Password must be at least 8 characters.');
        return;
      }

      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { dicta_role: role },
      });
      if (createError) throw createError;

      const profileId = requestedProfileId || slugProfileId(displayName || email.split('@')[0]);
      const { error: profileError } = await supabase.from('dicta_app_profiles').upsert(
        {
          user_id: created.user.id,
          profile_id: profileId,
          display_name: displayName || email,
          role,
          active: true,
          can_access_openrouter: canAccessOpenRouter,
          session_limit: sessionLimit,
        },
        { onConflict: 'user_id' },
      );
      if (profileError) throw profileError;

      res.status(201).json({
        userId: created.user.id,
        email,
        profileId,
        displayName: displayName || email,
        role,
        canAccessOpenRouter,
        sessionLimit,
      });
      return;
    }

    if (req.method === 'PATCH') {
      const body = normalizeBody(req.body);
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      const profileId = typeof body.profileId === 'string' ? body.profileId.trim() : '';
      if (!userId && !profileId) {
        res.status(400).send('userId or profileId is required.');
        return;
      }

      const patch = { updated_at: new Date().toISOString() };
      if (typeof body.canAccessOpenRouter === 'boolean') {
        patch.can_access_openrouter = body.canAccessOpenRouter;
      }
      if ('sessionLimit' in body) {
        patch.session_limit = normalizeMemberSessionLimit(body.sessionLimit);
      }

      if (!('can_access_openrouter' in patch) && !('session_limit' in patch)) {
        res.status(400).send('No supported profile access fields were provided.');
        return;
      }

      let query = supabase
        .from('dicta_app_profiles')
        .update(patch)
        .select(profileSelect());
      query = userId ? query.eq('user_id', userId) : query.eq('profile_id', profileId);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) {
        res.status(404).send('Dicta profile not found.');
        return;
      }
      res.status(200).json({ profile: data });
      return;
    }

    res.status(405).send('Method not allowed');
  } catch (error) {
    sendApiError(res, error, 'Dicta admin user request failed.');
  }
}
