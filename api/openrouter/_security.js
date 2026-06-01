import { createHash } from 'node:crypto';

const OPENROUTER_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const fallbackRateLimitStore = new Map();

export const OPENROUTER_RATE_LIMIT_SCOPES = {
  chat: 'openrouter_chat',
  jobs: 'openrouter_jobs',
};

export const OPENROUTER_RATE_LIMIT_DEFAULTS = {
  chat: {
    member: 30,
    admin: 180,
  },
  jobs: {
    member: 20,
    admin: 120,
  },
};

export function getPositiveIntEnv(name, fallback, min = 1, max = 10_000) {
  const numeric = Number(process.env[name]);
  const normalized = Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
  return Math.max(min, Math.min(max, normalized));
}

export async function enforceOpenRouterRateLimit({
  supabase,
  requester,
  res,
  scope,
  limit,
  windowSeconds = OPENROUTER_RATE_LIMIT_WINDOW_SECONDS,
  allowInMemoryFallback = false,
}) {
  const identifierHash = createHash('sha256').update(`profile:${requester?.profileId ?? 'unknown'}`).digest('hex');
  const safeLimit = Math.max(1, Math.min(Number(limit) || 1, 10_000));
  const safeWindowSeconds = Math.max(60, Math.min(Number(windowSeconds) || OPENROUTER_RATE_LIMIT_WINDOW_SECONDS, 86_400));

  const result = supabase
    ? await checkPersistentRateLimit({ supabase, scope, identifierHash, limit: safeLimit, windowSeconds: safeWindowSeconds })
    : checkFallbackRateLimit({ scope, identifierHash, limit: safeLimit, windowSeconds: safeWindowSeconds, allowInMemoryFallback });

  setRateLimitHeaders(res, result);
  if (!result.allowed) {
    await auditSecurityEvent(supabase, {
      eventType: `${scope}_rate_limited`,
      profileId: requester?.profileId,
      role: requester?.legacy ? 'legacy' : requester?.role,
      legacy: requester?.legacy,
      severity: 'warn',
      statusCode: 429,
      route: scope === OPENROUTER_RATE_LIMIT_SCOPES.chat ? '/api/openrouter/chat' : '/api/openrouter/jobs',
      reason: 'OpenRouter rate limit exceeded.',
      metadata: {
        scope,
        limit: result.limit,
        count: result.count,
        resetAt: result.resetAt,
        persisted: result.persisted,
      },
    });
    throw Object.assign(new Error('OpenRouter rate limit exceeded. Try again later.'), { statusCode: 429, rateLimit: result });
  }
  return result;
}

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

export function getOpenRouterLimit(kind, requester) {
  if (kind === 'chat') {
    return requester?.role === 'admin'
      ? getPositiveIntEnv('DICTA_OPENROUTER_ADMIN_CHAT_PER_HOUR', OPENROUTER_RATE_LIMIT_DEFAULTS.chat.admin, 1, 2_000)
      : getPositiveIntEnv('DICTA_OPENROUTER_MEMBER_CHAT_PER_HOUR', OPENROUTER_RATE_LIMIT_DEFAULTS.chat.member, 1, 2_000);
  }
  return requester?.role === 'admin'
    ? getPositiveIntEnv('DICTA_OPENROUTER_ADMIN_JOBS_PER_HOUR', OPENROUTER_RATE_LIMIT_DEFAULTS.jobs.admin, 1, 1_000)
    : getPositiveIntEnv('DICTA_OPENROUTER_MEMBER_JOBS_PER_HOUR', OPENROUTER_RATE_LIMIT_DEFAULTS.jobs.member, 1, 1_000);
}

function setRateLimitHeaders(res, result) {
  if (!res || typeof res.setHeader !== 'function') return;
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', result.resetAt);
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((new Date(result.resetAt).getTime() - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
  }
}

async function checkPersistentRateLimit({ supabase, scope, identifierHash, limit, windowSeconds }) {
  const { data, error } = await supabase.rpc('dicta_check_rate_limit', {
    p_scope: scope,
    p_identifier_hash: identifierHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    throw Object.assign(
      new Error(`OpenRouter rate limit check failed. Apply docs/supabase-openrouter-jobs.sql before enabling public beta OpenRouter routes. ${error.message}`),
      { statusCode: 500 },
    );
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw Object.assign(new Error('OpenRouter rate limit check returned no result.'), { statusCode: 500 });
  }
  const resetAt = row.reset_at ? new Date(row.reset_at).toISOString() : new Date(Date.now() + windowSeconds * 1000).toISOString();
  const requestCount = Math.max(0, Number(row.request_count ?? 0));
  return {
    allowed: row.allowed === true,
    limit,
    remaining: Math.max(0, Number(row.remaining ?? 0)),
    count: requestCount,
    resetAt,
    persisted: true,
  };
}

function checkFallbackRateLimit({ scope, identifierHash, limit, windowSeconds, allowInMemoryFallback }) {
  if (!allowInMemoryFallback) {
    throw Object.assign(new Error('Persistent OpenRouter rate limiting is not configured.'), { statusCode: 500 });
  }
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  cleanupFallbackStore(now, windowMs);
  const key = `${scope}:${identifierHash}:${windowStart}`;
  const next = (fallbackRateLimitStore.get(key) ?? 0) + 1;
  fallbackRateLimitStore.set(key, next);
  return {
    allowed: next <= limit,
    limit,
    remaining: Math.max(0, limit - next),
    count: next,
    resetAt: new Date(windowStart + windowMs).toISOString(),
    persisted: false,
  };
}

function cleanupFallbackStore(now, windowMs) {
  const oldestAllowedWindow = Math.floor((now - windowMs * 2) / windowMs) * windowMs;
  for (const key of fallbackRateLimitStore.keys()) {
    const windowStart = Number(key.split(':').at(-1));
    if (Number.isFinite(windowStart) && windowStart < oldestAllowedWindow) {
      fallbackRateLimitStore.delete(key);
    }
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
