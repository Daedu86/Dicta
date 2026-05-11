import { next } from '@vercel/functions';

const AUTH_COOKIE = 'dicta_auth';
const LOGIN_PATH = '/login.html';

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const cookie = request.headers.get('cookie') ?? '';
  const pairs = cookie.split(';').map((part) => part.trim());
  const match = pairs.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

function isPublicPath(pathname) {
  return (
    pathname === LOGIN_PATH ||
    pathname === '/api/auth/login' ||
    pathname === '/favicon.svg'
  );
}

export default async function middleware(request) {
  const password = process.env.DICTA_APP_PASSWORD?.trim();
  if (!password) return next();

  const url = new URL(request.url);
  if (isPublicPath(url.pathname)) return next();

  const expected = await sha256(password);
  if (getCookie(request, AUTH_COOKIE) === expected) return next();

  url.pathname = LOGIN_PATH;
  url.searchParams.set('next', new URL(request.url).pathname);
  return Response.redirect(url, 302);
}

export const config = {
  matcher: ['/((?!.*\\..*).*)', '/api/:path*', '/assets/:path*', '/favicon.svg'],
};
