import { createHash } from 'node:crypto';

import { auditSecurityEvent } from '../_securityEvents.js';

const ADMIN_USERS_ROUTE = '/api/admin/users';

function hashValue(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

export async function auditAdminUserEvent(supabase, eventType, requester, details = {}) {
  await auditSecurityEvent(supabase, {
    eventType,
    profileId: requester?.profileId,
    role: requester?.role,
    severity: details.severity ?? 'warn',
    statusCode: details.statusCode,
    route: ADMIN_USERS_ROUTE,
    reason: details.reason,
    metadata: details.metadata,
  });
}

export function buildAdminUserCreatedAuditMetadata({
  userId,
  email,
  profileId,
  role,
  canAccessOpenRouter,
  assignedOpenRouterModel,
  sessionLimit,
}) {
  return {
    targetUserIdHash: hashValue(userId),
    targetEmailHash: hashValue(email),
    targetProfileId: profileId,
    targetRole: role,
    canAccessOpenRouter,
    assignedOpenRouterModel,
    sessionLimit,
  };
}

export function buildAdminUserAccessUpdatedAuditMetadata({ profile, updatedFields }) {
  return {
    targetUserIdHash: profile.user_id ? hashValue(profile.user_id) : null,
    targetProfileId: profile.profile_id,
    updatedFields,
  };
}
