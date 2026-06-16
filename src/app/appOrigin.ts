export type AppOriginOptions = {
  configuredOrigin?: string | null;
  currentOrigin: string;
};

export function buildCanonicalAppOrigin({ configuredOrigin, currentOrigin }: AppOriginOptions): string {
  const normalizedConfiguredOrigin = normalizeOrigin(configuredOrigin);
  if (normalizedConfiguredOrigin) {
    return normalizedConfiguredOrigin;
  }

  return normalizeOrigin(currentOrigin);
}

export function buildAppUrl(path: string, options: AppOriginOptions): string {
  return `${buildCanonicalAppOrigin(options)}${normalizePath(path)}`;
}

function normalizeOrigin(origin: string | null | undefined): string {
  return origin?.trim().replace(/\/+$/, '') ?? '';
}

function normalizePath(path: string): string {
  const trimmedPath = path.trim();
  if (!trimmedPath) return '/';
  return `/${trimmedPath.replace(/^\/+/, '')}`;
}
