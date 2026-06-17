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

export type AppHomeNavigationPlan = {
  href: string;
  isSameOrigin: boolean;
};

export type AppHomeNavigationActions = {
  assignLocation: (href: string) => void;
  navigateAppRoute: (path: '/') => void;
  showLeaderboardWorkspace: () => void;
  stopFocusedTrainingPlayback: () => void;
};

export function buildAppHomeNavigationPlan(options: AppOriginOptions): AppHomeNavigationPlan {
  const href = buildAppUrl('/', options);
  return {
    href,
    isSameOrigin: getUrlOrigin(href) === getUrlOrigin(options.currentOrigin),
  };
}

export function navigateAppHome(options: AppOriginOptions, actions: AppHomeNavigationActions): AppHomeNavigationPlan {
  const plan = buildAppHomeNavigationPlan(options);
  if (!plan.isSameOrigin) {
    actions.assignLocation(plan.href);
    return plan;
  }

  actions.stopFocusedTrainingPlayback();
  actions.showLeaderboardWorkspace();
  actions.navigateAppRoute('/');
  return plan;
}

function normalizeOrigin(origin: string | null | undefined): string {
  return origin?.trim().replace(/\/+$/, '') ?? '';
}

function normalizePath(path: string): string {
  const trimmedPath = path.trim();
  if (!trimmedPath) return '/';
  return `/${trimmedPath.replace(/^\/+/, '')}`;
}

function getUrlOrigin(value: string): string {
  return new URL(value).origin;
}
