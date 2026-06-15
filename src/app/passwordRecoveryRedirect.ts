export type PasswordRecoveryRedirectUrlOptions = {
  configuredOrigin?: string | null;
  currentOrigin: string;
  path?: string;
};

export function buildPasswordRecoveryRedirectUrl({
  configuredOrigin,
  currentOrigin,
  path = '/training',
}: PasswordRecoveryRedirectUrlOptions): string {
  const origin = normalizeRedirectOrigin(configuredOrigin) || normalizeRedirectOrigin(currentOrigin);
  const normalizedPath = normalizeRedirectPath(path);
  return `${origin}${normalizedPath}`;
}

function normalizeRedirectOrigin(origin: string | null | undefined): string {
  return origin?.trim().replace(/\/+$/, '') ?? '';
}

function normalizeRedirectPath(path: string): string {
  const trimmedPath = path.trim();
  if (!trimmedPath) return '/';
  return `/${trimmedPath.replace(/^\/+/, '')}`;
}
