import { createHash } from 'node:crypto';

const AUTH_COOKIE = 'dicta_auth';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const configuredPassword = process.env.DICTA_APP_PASSWORD?.trim();
  if (!configuredPassword) {
    res.status(500).send('DICTA_APP_PASSWORD is not configured.');
    return;
  }

  const password = readPassword(req.body);
  if (password !== configuredPassword) {
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
