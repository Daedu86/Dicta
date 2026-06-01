export async function auditSecurityEvent(supabase, event) {
  const sanitized = sanitizeAuditEvent(event);
  const logMethod = sanitized.severity === 'error' ? console.error : console.warn;
  logMethod('[dicta-security-event]', JSON.stringify(sanitized));

  if (!supabase) return;
  try {
    await supabase.from('dicta_security_events').insert({
      event_type: sanitized.eventType,
      profile_id: sanitized.profileId,
      role: sanitized.role,
      legacy: sanitized.legacy,
      severity: sanitized.severity,
      status_code: sanitized.statusCode,
      route: sanitized.route,
      model: sanitized.model,
      reason: sanitized.reason,
      metadata: sanitized.metadata,
      created_at: sanitized.createdAt,
    });
  } catch (error) {
    console.warn('[dicta-security-event-persist-failed]', error instanceof Error ? error.message : String(error));
  }
}

function sanitizeAuditEvent(event) {
  return {
    eventType: String(event?.eventType || 'unknown').slice(0, 80),
    profileId: event?.profileId ? String(event.profileId).slice(0, 120) : null,
    role: event?.role === 'admin' ? 'admin' : event?.role === 'member' ? 'member' : event?.role === 'legacy' ? 'legacy' : null,
    legacy: event?.legacy === true,
    severity: event?.severity === 'error' ? 'error' : event?.severity === 'info' ? 'info' : 'warn',
    statusCode: Number.isFinite(Number(event?.statusCode)) ? Number(event.statusCode) : null,
    route: event?.route ? String(event.route).slice(0, 160) : null,
    model: event?.model ? String(event.model).slice(0, 160) : null,
    reason: event?.reason ? String(event.reason).slice(0, 500) : null,
    metadata: event?.metadata && typeof event.metadata === 'object' ? event.metadata : {},
    createdAt: new Date().toISOString(),
  };
}
