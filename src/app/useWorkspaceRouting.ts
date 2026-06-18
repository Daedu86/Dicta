import { startTransition, useCallback, useEffect, useState } from 'react';
import type { SessionInputMode } from '../core/sessionInputModes';
import { safeSetLocalStorageItem } from '../core/storage/safeLocalStorage';

const WORKSPACE_MODE_KEY = 'dicta.workspaceMode.v1';

export type WorkspaceMode =
  | 'training'
  | 'dashboard'
  | 'tts'
  | 'adaptive'
  | 'admin'
  | 'openrouter';

type AppRoutePath = '/' | '/training';

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
  showDashboardWorkspace: (sessionId: string) => void;
  showSessionInputWorkspace: (inputMode: SessionInputMode) => void;
};

export function useWorkspaceRouting(): WorkspaceRouting {
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('training');
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [dashboardSessionId, setDashboardSessionId] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      setWorkspaceMode('training');
      setDashboardSessionId(null);
    });
  }, []);

  useEffect(() => {
    const onRouteChange = () => {
      startTransition(() => {
        setCurrentPath(window.location.pathname);
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
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }

    startTransition(() => {
      setCurrentPath(path);
    });
  }, []);

  const showWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    startTransition(() => {
      setWorkspaceMode(mode);
    });
  }, []);

  const showWorkspace = useCallback((mode: WorkspaceMode) => {
    startTransition(() => {
      setWorkspaceMode(mode);
      setDashboardSessionId(null);
    });
  }, []);

  const showLeaderboardWorkspace = useCallback(() => showWorkspace('training'), [showWorkspace]);
  const showAdminWorkspace = useCallback(() => showWorkspace('admin'), [showWorkspace]);
  const showOpenRouterWorkspace = useCallback(() => showWorkspace('openrouter'), [showWorkspace]);
  const showAdaptiveWorkspace = useCallback(() => showWorkspace('adaptive'), [showWorkspace]);

  const showDashboardWorkspace = useCallback((sessionId: string) => {
    startTransition(() => {
      setDashboardSessionId(sessionId);
      setWorkspaceMode('dashboard');
    });
  }, []);

  const showSessionInputWorkspace = useCallback((inputMode: SessionInputMode) => {
    void inputMode;
    if (window.location.pathname !== '/training') {
      window.history.pushState(null, '', '/training');
    }

    startTransition(() => {
      setDashboardSessionId(null);
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
    showDashboardWorkspace,
    showSessionInputWorkspace,
  };
}
