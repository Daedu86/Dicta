import { createHash } from 'node:crypto';

const AUTH_COOKIE = 'dicta_auth';
const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const loginAttempts = new Map();

function hashPassword(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readPassword(body) {
  if (typeof body?.password === 'string') return body.password;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return typeof parsed?.password === 'string' ? parsed.password : '';
    } catch {
      return '';
    }
  }
  if (Buffer.isBuffer(body)) {
    try {
      const parsed = JSON.parse(body.toString('utf8'));
      return typeof parsed?.password === 'string' ? parsed.password : '';
    } catch {
      return '';
    }
  }
  return '';
}

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] ?? '')
    .split(',')
    .map((part) => part.trim())
    .find(Boolean);
  return forwarded || String(req.headers['x-real-ip'] ?? req.socket?.remoteAddress ?? 'unknown');
}

function checkLegacyLoginRateLimit(req) {
  const now = Date.now();
  const windowStart = Math.floor(now / LOGIN_RATE_LIMIT_WINDOW_MS) * LOGIN_RATE_LIMIT_WINDOW_MS;
  const identifier = hashPassword(getClientIp(req));
  const key = `${identifier}:${windowStart}`;
  for (const existingKey of loginAttempts.keys()) {
    const existingWindow = Number(existingKey.split(':').at(-1));
    if (Number.isFinite(existingWindow) && existingWindow < windowStart - LOGIN_RATE_LIMIT_WINDOW_MS) {
      loginAttempts.delete(existingKey);
    }
  }
  const attempts = (loginAttempts.get(key) ?? 0) + 1;
  loginAttempts.set(key, attempts);
  const resetAt = new Date(windowStart + LOGIN_RATE_LIMIT_WINDOW_MS).toISOString();
  return {
    allowed: attempts <= LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    limit: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    remaining: Math.max(0, LOGIN_RATE_LIMIT_MAX_ATTEMPTS - attempts),
    resetAt,
  };
}

function setRateLimitHeaders(res, rateLimit) {
  res.setHeader('X-RateLimit-Limit', String(rateLimit.limit));
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
  res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((new Date(rateLimit.resetAt).getTime() - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
  }
}

function auditLegacyLoginEvent(eventType, req, details = {}) {
  const severity = details.severity === 'error' ? 'error' : details.severity === 'info' ? 'info' : 'warn';
  const logMethod = severity === 'error' ? console.error : console.warn;
  logMethod('[dicta-security-event]', JSON.stringify({
    eventType,
    route: '/api/auth/login',
    role: 'legacy',
    legacy: true,
    severity,
    statusCode: details.statusCode ?? null,
    reason: details.reason ?? '',
    metadata: {
      clientIpHash: hashPassword(getClientIp(req)),
      ...(details.metadata && typeof details.metadata === 'object' ? details.metadata : {}),
    },
    createdAt: new Date().toISOString(),
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const configuredPassword = process.env.DICTA_APP_PASSWORD?.trim();
  if (!configuredPassword) {
    auditLegacyLoginEvent('legacy_login_missing_config', req, {
      severity: 'error',
      statusCode: 500,
      reason: 'DICTA_APP_PASSWORD is not configured.',
    });
    res.status(500).send('DICTA_APP_PASSWORD is not configured. Use Supabase Auth for public beta deployments.');
    return;
  }

  const rateLimit = checkLegacyLoginRateLimit(req);
  setRateLimitHeaders(res, rateLimit);
  if (!rateLimit.allowed) {
    auditLegacyLoginEvent('legacy_login_rate_limited', req, {
      statusCode: 429,
      reason: 'Too many legacy login attempts.',
      metadata: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    });
    res.status(429).send('Too many login attempts. Try again later.');
    return;
  }

  const password = readPassword(req.body);
  if (password !== configuredPassword) {
    auditLegacyLoginEvent('legacy_login_failed', req, {
      statusCode: 401,
      reason: 'Invalid legacy password.',
      metadata: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    });
    res.status(401).send('Invalid password.');
    return;
  }

  const secure = req.headers['x-forwarded-proto'] === 'https' || Boolean(req.headers.host?.includes('vercel.app'));
  const cookie = [
    `${AUTH_COOKIE}=${encodeURIComponent(hashPassword(configuredPassword))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=2592000',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ ok: true });
}
