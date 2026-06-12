import { useCallback, useEffect, useState } from 'react';
import type { SessionInputMode } from '../core/sessionInputModes';

const WORKSPACE_MODE_KEY = 'dicta.workspaceMode.v1';

export type WorkspaceMode =
  | 'training'
  | 'leaderboard'
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
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('leaderboard');
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [dashboardSessionId, setDashboardSessionId] = useState<string | null>(null);

  useEffect(() => {
    setWorkspaceMode('leaderboard');
    setDashboardSessionId(null);
  }, []);

  useEffect(() => {
    const onRouteChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onRouteChange);
    return () => window.removeEventListener('popstate', onRouteChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(WORKSPACE_MODE_KEY, workspaceMode);
  }, [workspaceMode]);

  const clearDashboardSession = useCallback(() => {
    setDashboardSessionId(null);
  }, []);

  const navigateAppRoute = useCallback((path: AppRoutePath) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(path);
  }, []);

  const showWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
  }, []);

  const showWorkspace = useCallback((mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    setDashboardSessionId(null);
  }, []);

  const showLeaderboardWorkspace = useCallback(() => showWorkspace('leaderboard'), [showWorkspace]);
  const showAdminWorkspace = useCallback(() => showWorkspace('admin'), [showWorkspace]);
  const showOpenRouterWorkspace = useCallback(() => showWorkspace('openrouter'), [showWorkspace]);
  const showAdaptiveWorkspace = useCallback(() => showWorkspace('adaptive'), [showWorkspace]);

  const showDashboardWorkspace = useCallback((sessionId: string) => {
    setDashboardSessionId(sessionId);
    setWorkspaceMode('dashboard');
  }, []);

  const showSessionInputWorkspace = useCallback((inputMode: SessionInputMode) => {
    void inputMode;
    setDashboardSessionId(null);
    if (window.location.pathname !== '/training') {
      window.history.pushState(null, '', '/training');
    }
    setCurrentPath('/training');
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
