import { startTransition, useCallback, useEffect, useState } from 'react';
import type { SessionInputMode } from '../core/sessionInputModes';
import { safeSetLocalStorageItem } from '../core/storage/safeLocalStorage';

const WORKSPACE_MODE_KEY = 'dicta.workspaceMode.v1';

export type WorkspaceMode =
  | 'training'
  | 'dashboard'
  | 'tts'
  | 'adaptive'
  | 'adaptive-flow'
  | 'admin'
  | 'openrouter';

type AppRoutePath = '/' | '/training' | '/adaptive' | '/adaptive/flow' | '/admin' | '/openrouter';

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
  showAdaptiveWorkspace: () => void;
  showAdaptiveFlowWorkspace: () => void;
  showDashboardWorkspace: (sessionId: string) => void;
  showSessionInputWorkspace: (inputMode: SessionInputMode) => void;
};

function getWorkspaceModeForPath(path: string): WorkspaceMode {
  switch (path.replace(/\/$/, '') || '/') {
    case '/adaptive':
      return 'adaptive';
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

function getPathForWorkspaceMode(mode: WorkspaceMode): AppRoutePath {
  switch (mode) {
    case 'adaptive':
      return '/adaptive';
    case 'adaptive-flow':
      return '/adaptive/flow';
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
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }
}

export function useWorkspaceRouting(): WorkspaceRouting {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => getWorkspaceModeForPath(window.location.pathname));
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [dashboardSessionId, setDashboardSessionId] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      setWorkspaceMode(getWorkspaceModeForPath(window.location.pathname));
      setDashboardSessionId(null);
    });
  }, []);

  useEffect(() => {
    const onRouteChange = () => {
      const nextPath = window.location.pathname;

      startTransition(() => {
        setCurrentPath(nextPath);
        setWorkspaceMode(getWorkspaceModeForPath(nextPath));
        setDashboardSessionId(null);
      });
    };

    window.addEventListener('popstate', onRouteChange);
    return () => window.removeEventListener('popstate', onRouteChange);
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
      setCurrentPath(path);
      setWorkspaceMode(getWorkspaceModeForPath(path));
      setDashboardSessionId(null);
    });
  }, []);

  const showWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    const path = getPathForWorkspaceMode(mode);
    pushAppRoute(path);

    startTransition(() => {
      setCurrentPath(path);
      setWorkspaceMode(mode);
    });
  }, []);

  const showWorkspace = useCallback((mode: WorkspaceMode) => {
    const path = getPathForWorkspaceMode(mode);
    pushAppRoute(path);

    startTransition(() => {
      setCurrentPath(path);
      setWorkspaceMode(mode);
      setDashboardSessionId(null);
    });
  }, []);

  const showLeaderboardWorkspace = useCallback(() => showWorkspace('training'), [showWorkspace]);
  const showAdminWorkspace = useCallback(() => showWorkspace('admin'), [showWorkspace]);
  const showOpenRouterWorkspace = useCallback(() => showWorkspace('openrouter'), [showWorkspace]);
  const showAdaptiveWorkspace = useCallback(() => showWorkspace('adaptive'), [showWorkspace]);
  const showAdaptiveFlowWorkspace = useCallback(() => showWorkspace('adaptive-flow'), [showWorkspace]);

  const showDashboardWorkspace = useCallback((sessionId: string) => {
    pushAppRoute('/');

    startTransition(() => {
      setCurrentPath('/');
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
      setCurrentPath('/training');
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
    showAdaptiveWorkspace,
    showAdaptiveFlowWorkspace,
    showDashboardWorkspace,
    showSessionInputWorkspace,
  };
}
