import { createSupabaseServiceClient, resolveRequestProfile, sendApiError } from '../_supabaseProfile.js';
import {
  auditAdminUserEvent,
  buildAdminUserAccessUpdatedAuditMetadata,
  buildAdminUserCreatedAuditMetadata,
} from './adminUsersAudit.js';
import {
  hasSupportedProfileAccessPatch,
  parseCreateAdminUserBody,
  parseProfileAccessPatchBody,
  profileAccessPatchFields,
  profileSelect,
  resolveCreatedProfileId,
} from './adminUsersPayloads.js';

export default async function handler(req, res) {
  let requester;
  let supabase = null;
  try {
    requester = await resolveRequestProfile(req);
    supabase = createSupabaseServiceClient();
    if (requester.role !== 'admin') {
      await auditAdminUserEvent(supabase, 'admin_users_access_rejected', requester, {
        statusCode: 403,
        reason: 'Admin access required.',
      });
      res.status(403).send('Admin access required.');
      return;
    }

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
      const {
        email,
        password,
        displayName,
        requestedProfileId,
        role,
        canAccessOpenRouter,
        assignedOpenRouterModel,
        sessionLimit,
      } = parseCreateAdminUserBody(req.body);

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

      const profileId = resolveCreatedProfileId({ requestedProfileId, displayName, email });
      const { error: profileError } = await supabase.from('dicta_app_profiles').upsert(
        {
          user_id: created.user.id,
          profile_id: profileId,
          display_name: displayName || email,
          role,
          active: true,
          can_access_openrouter: canAccessOpenRouter,
          assigned_openrouter_model: assignedOpenRouterModel,
          session_limit: sessionLimit,
        },
        { onConflict: 'user_id' },
      );
      if (profileError) throw profileError;

      await auditAdminUserEvent(supabase, 'admin_user_created', requester, {
        severity: 'info',
        statusCode: 201,
        reason: 'Admin created a Dicta user profile.',
        metadata: buildAdminUserCreatedAuditMetadata({
          userId: created.user.id,
          email,
          profileId,
          role,
          canAccessOpenRouter,
          assignedOpenRouterModel,
          sessionLimit,
        }),
      });

      res.status(201).json({
        userId: created.user.id,
        email,
        profileId,
        displayName: displayName || email,
        role,
        canAccessOpenRouter,
        assignedOpenRouterModel,
        sessionLimit,
      });
      return;
    }

    if (req.method === 'PATCH') {
      const { userId, profileId, patch } = parseProfileAccessPatchBody(req.body);
      if (!userId && !profileId) {
        res.status(400).send('userId or profileId is required.');
        return;
      }

      if (!hasSupportedProfileAccessPatch(patch)) {
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

      await auditAdminUserEvent(supabase, 'admin_user_access_updated', requester, {
        severity: 'info',
        statusCode: 200,
        reason: 'Admin updated Dicta profile access fields.',
        metadata: buildAdminUserAccessUpdatedAuditMetadata({
          profile: data,
          updatedFields: profileAccessPatchFields(patch),
        }),
      });

      res.status(200).json({ profile: data });
      return;
    }

    res.status(405).send('Method not allowed');
  } catch (error) {
    await auditAdminUserEvent(supabase, 'admin_users_request_failed', requester, {
      severity: 'error',
      statusCode: error?.statusCode,
      reason: error instanceof Error ? error.message : 'Dicta admin user request failed.',
      metadata: { method: req.method },
    });
    sendApiError(res, error, 'Dicta admin user request failed.');
  }
}
