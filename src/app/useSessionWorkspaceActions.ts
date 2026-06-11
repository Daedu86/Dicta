import { useCallback } from 'react';
import type { StoredSession } from './sessionTypes';

type UseSessionWorkspaceActionsArgs = {
  dashboardSessionId: string | null;
  workspaceMode: string;
  clearDashboardSession: () => void;
  showLeaderboardWorkspace: () => void;
  deleteSessionAndSync: (sessionId: string) => void;
  setActiveSessionId: (sessionId: string) => void;
  showDashboardWorkspace: (sessionId: string) => void;
  showSessionInputWorkspace: (inputMode: StoredSession['inputMode']) => void;
};

export function useSessionWorkspaceActions({
  dashboardSessionId,
  workspaceMode,
  clearDashboardSession,
  showLeaderboardWorkspace,
  deleteSessionAndSync,
  setActiveSessionId,
  showDashboardWorkspace,
  showSessionInputWorkspace,
}: UseSessionWorkspaceActionsArgs) {
  const deleteSession = useCallback((sessionId: string): void => {
    if (dashboardSessionId === sessionId) {
      clearDashboardSession();
      if (workspaceMode === 'dashboard') {
        showLeaderboardWorkspace();
      }
    }
    deleteSessionAndSync(sessionId);
  }, [
    clearDashboardSession,
    dashboardSessionId,
    deleteSessionAndSync,
    showLeaderboardWorkspace,
    workspaceMode,
  ]);

  const openDashboardForSession = useCallback((sessionId: string): void => {
    setActiveSessionId(sessionId);
    showDashboardWorkspace(sessionId);
  }, [setActiveSessionId, showDashboardWorkspace]);

  const openWorkspaceForSession = useCallback((session: StoredSession): void => {
    setActiveSessionId(session.id);
    showSessionInputWorkspace(session.inputMode);
  }, [setActiveSessionId, showSessionInputWorkspace]);

  return {
    deleteSession,
    openDashboardForSession,
    openWorkspaceForSession,
  };
}
