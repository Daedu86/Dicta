import { auditSecurityEvent } from './_security.js';

const JOB_ROUTE = '/api/openrouter/jobs';

export async function auditOpenRouterJobEvent(supabase, eventType, requester, details = {}) {
  await auditSecurityEvent(supabase, {
    eventType,
    profileId: requester?.profileId,
    role: requester?.role,
    severity: details.severity ?? 'warn',
    statusCode: details.statusCode,
    route: JOB_ROUTE,
    model: details.model,
    reason: details.reason,
    metadata: details.metadata,
  });
}
