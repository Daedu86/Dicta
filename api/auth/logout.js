const AUTH_COOKIE = 'dicta_auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const secure = req.headers['x-forwarded-proto'] === 'https' || Boolean(req.headers.host?.includes('vercel.app'));
  const cookie = [
    `${AUTH_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ ok: true });
}
