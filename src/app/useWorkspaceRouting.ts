import { startTransition, useCallback, useEffect, useState } from 'react';
import type { SessionInputMode } from '../core/sessionInputModes';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../core/storage/safeLocalStorage';

const WORKSPACE_MODE_KEY = 'dicta.workspaceMode.v1';
const ADAPTIVE_FLOW_HASH = '#adaptive-flow';
const ADAPTIVE_FLOW_HASH_PREFIX = `${ADAPTIVE_FLOW_HASH}/`;

export type WorkspaceMode =
  | 'training'
  | 'dashboard'
  | 'tts'
  | 'adaptive-flow'
  | 'admin'
  | 'openrouter';

type AdaptiveFlowPhaseRoutePath = `/#adaptive-flow/${string}`;
type AppRoutePath =
  | '/'
  | '/training'
  | '/adaptive/flow'
  | '/#adaptive-flow'
  | AdaptiveFlowPhaseRoutePath
  | '/admin'
  | '/openrouter';

function loadInitialWorkspaceMode(): WorkspaceMode {
  const routeMode = getCurrentWorkspaceMode();
  if (routeMode !== 'training') return routeMode;

  return safeGetLocalStorageItem(WORKSPACE_MODE_KEY) === 'adaptive-flow' ? 'adaptive-flow' : routeMode;
}

type WorkspaceRouting = {
  workspaceMode: WorkspaceMode;
  currentPath: string;
  dashboardSessionId: string | null;
  clearDashboardSession: () => void;
  navigateAppRoute: (path: AppRoutePath) => void;
  showWorkspaceMode: (mode: WorkspaceMode) => void;
  showLeaderboardWorkspace: () => void;
  showAdminWorkspace: () => void;
  showOpenRouterWorkspace: () => void;
  showAdaptiveFlowWorkspace: () => void;
  showAdaptiveFlowGenerationWorkspace: () => void;
  showDashboardWorkspace: (sessionId: string) => void;
  showSessionInputWorkspace: (inputMode: SessionInputMode) => void;
};

function getCurrentAppPath() {
  return `${window.location.pathname}${window.location.hash}`;
}

function getWorkspaceModeForLocation(path: string, hash = ''): WorkspaceMode {
  if (
    hash === ADAPTIVE_FLOW_HASH ||
    hash.startsWith(ADAPTIVE_FLOW_HASH_PREFIX) ||
    path === '/#adaptive-flow' ||
    path.startsWith('/#adaptive-flow/')
  ) {
    return 'adaptive-flow';
  }

  switch (path.replace(/\/$/, '') || '/') {
    case '/adaptive/flow':
      return 'adaptive-flow';
    case '/admin':
      return 'admin';
    case '/openrouter':
      return 'openrouter';
    case '/training':
    case '/':
    default:
      return 'training';
  }
}

function getCurrentWorkspaceMode(): WorkspaceMode {
  return getWorkspaceModeForLocation(window.location.pathname, window.location.hash);
}

function getPathForWorkspaceMode(mode: WorkspaceMode): AppRoutePath {
  switch (mode) {
    case 'adaptive-flow':
      return '/#adaptive-flow';
    case 'admin':
      return '/admin';
    case 'openrouter':
      return '/openrouter';
    case 'training':
    case 'dashboard':
    case 'tts':
    default:
      return '/';
  }
}

function pushAppRoute(path: AppRoutePath) {
  if (getCurrentAppPath() !== path) {
    window.history.pushState(null, '', path);
  }
}

export function useWorkspaceRouting(): WorkspaceRouting {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => loadInitialWorkspaceMode());
  const [currentPath, setCurrentPath] = useState(() => getCurrentAppPath());
  const [dashboardSessionId, setDashboardSessionId] = useState<string | null>(null);

  useEffect(() => {
    const onRouteChange = () => {
      const nextPath = getCurrentAppPath();

      startTransition(() => {
        setCurrentPath(nextPath);
        setWorkspaceMode(getCurrentWorkspaceMode());
        setDashboardSessionId(null);
      });
    };

    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('hashchange', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('hashchange', onRouteChange);
    };
  }, []);

  useEffect(() => {
    safeSetLocalStorageItem(WORKSPACE_MODE_KEY, workspaceMode);
  }, [workspaceMode]);

  const clearDashboardSession = useCallback(() => {
    startTransition(() => {
      setDashboardSessionId(null);
    });
  }, []);

  const navigateAppRoute = useCallback((path: AppRoutePath) => {
    pushAppRoute(path);

    startTransition(() => {
      setCurrentPath(getCurrentAppPath());
      setWorkspaceMode(getCurrentWorkspaceMode());
      setDashboardSessionId(null);
    });
  }, []);

  const showWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    const path = getPathForWorkspaceMode(mode);
    pushAppRoute(path);

    startTransition(() => {
      setCurrentPath(getCurrentAppPath());
      setWorkspaceMode(mode);
    });
  }, []);

  const showWorkspace = useCallback((mode: WorkspaceMode) => {
    const path = getPathForWorkspaceMode(mode);
    pushAppRoute(path);

    startTransition(() => {
      setCurrentPath(getCurrentAppPath());
      setWorkspaceMode(mode);
      setDashboardSessionId(null);
    });
  }, []);

  const showLeaderboardWorkspace = useCallback(() => showWorkspace('training'), [showWorkspace]);
  const showAdminWorkspace = useCallback(() => showWorkspace('admin'), [showWorkspace]);
  const showOpenRouterWorkspace = useCallback(() => showWorkspace('openrouter'), [showWorkspace]);
  const showAdaptiveFlowWorkspace = useCallback(() => showWorkspace('adaptive-flow'), [showWorkspace]);
  const showAdaptiveFlowGenerationWorkspace = useCallback(() => navigateAppRoute('/#adaptive-flow/generation'), [navigateAppRoute]);

  const showDashboardWorkspace = useCallback((sessionId: string) => {
    pushAppRoute('/');

    startTransition(() => {
      setCurrentPath(getCurrentAppPath());
      setDashboardSessionId(sessionId);
      setWorkspaceMode('dashboard');
    });
  }, []);

  const showSessionInputWorkspace = useCallback((inputMode: SessionInputMode) => {
    void inputMode;
    pushAppRoute('/training');

    startTransition(() => {
      setDashboardSessionId(null);
      setWorkspaceMode('training');
      setCurrentPath(getCurrentAppPath());
    });
  }, []);

  return {
    workspaceMode,
    currentPath,
    dashboardSessionId,
    clearDashboardSession,
    navigateAppRoute,
    showWorkspaceMode,
    showLeaderboardWorkspace,
    showAdminWorkspace,
    showOpenRouterWorkspace,
    showAdaptiveFlowWorkspace,
    showAdaptiveFlowGenerationWorkspace,
    showDashboardWorkspace,
    showSessionInputWorkspace,
  };
}
