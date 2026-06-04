import { useCallback, useEffect, useState } from 'react';
import type { SessionInputMode } from '../core/sessionNormalization';

const WORKSPACE_MODE_KEY = 'dicta.workspaceMode.v1';

export type WorkspaceMode =
  | 'training'
  | 'leaderboard'
  | 'dashboard'
  | 'tts'
  | 'kokoro'
  | 'adaptive'
  | 'admin'
  | 'openrouter'
  | 'ollama';

type AppRoutePath = '/' | '/training';

type WorkspaceRouting = {
  workspaceMode: WorkspaceMode;
  currentPath: string;
  dashboardSessionId: string | null;
  clearDashboardSession: () => void;
  navigateAppRoute: (path: AppRoutePath) => void;
  showWorkspaceMode: (mode: WorkspaceMode) => void;
  showLeaderboardWorkspace: () => void;
  showTrainingWorkspace: () => void;
  showAdminWorkspace: () => void;
  showOpenRouterWorkspace: () => void;
  showOllamaWorkspace: () => void;
  showAdaptiveWorkspace: () => void;
  showDashboardWorkspace: (sessionId: string) => void;
  showSessionInputWorkspace: (inputMode: SessionInputMode) => void;
};

export function getWorkspaceModeForSessionInput(inputMode: SessionInputMode): WorkspaceMode {
  if (inputMode === 'input1') return 'training';
  if (inputMode === 'input2' || inputMode === 'input4') return 'tts';
  return 'kokoro';
}

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
  const showTrainingWorkspace = useCallback(() => showWorkspace('training'), [showWorkspace]);
  const showAdminWorkspace = useCallback(() => showWorkspace('admin'), [showWorkspace]);
  const showOpenRouterWorkspace = useCallback(() => showWorkspace('openrouter'), [showWorkspace]);
  const showOllamaWorkspace = useCallback(() => showWorkspace('ollama'), [showWorkspace]);
  const showAdaptiveWorkspace = useCallback(() => showWorkspace('adaptive'), [showWorkspace]);

  const showDashboardWorkspace = useCallback((sessionId: string) => {
    setDashboardSessionId(sessionId);
    setWorkspaceMode('dashboard');
  }, []);

  const showSessionInputWorkspace = useCallback((inputMode: SessionInputMode) => {
    setDashboardSessionId(null);
    setWorkspaceMode(getWorkspaceModeForSessionInput(inputMode));
  }, []);

  return {
    workspaceMode,
    currentPath,
    dashboardSessionId,
    clearDashboardSession,
    navigateAppRoute,
    showWorkspaceMode,
    showLeaderboardWorkspace,
    showTrainingWorkspace,
    showAdminWorkspace,
    showOpenRouterWorkspace,
    showOllamaWorkspace,
    showAdaptiveWorkspace,
    showDashboardWorkspace,
    showSessionInputWorkspace,
  };
}
