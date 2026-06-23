import { useEffect } from 'react';
import type { WorkspaceMode } from './useWorkspaceRouting';
import type { StoredSession } from './sessionTypes';

interface UseWorkspaceNavigationEffectsOptions {
  sessions: StoredSession[];
  activeSession: StoredSession | null;
  activeSessionId: string;
  activeInputWorkspaceMode: WorkspaceMode;
  workspaceMode: WorkspaceMode;
  isFocusedTrainingRoute: boolean;
  openRouterAccessState: string;
  openRouterAccessMessage: string;
  suppressSidebarAutoSelectRef: { current: boolean };
  setActiveSessionId: (sessionId: string) => void;
  setOpenRouterError: (message: string) => void;
  showLeaderboardWorkspace: () => void;
  showWorkspaceMode: (workspaceMode: WorkspaceMode) => void;
}

export function useWorkspaceNavigationEffects({
  sessions,
  activeSession,
  activeSessionId,
  activeInputWorkspaceMode,
  workspaceMode,
  isFocusedTrainingRoute,
  openRouterAccessState,
  openRouterAccessMessage,
  suppressSidebarAutoSelectRef,
  setActiveSessionId,
  setOpenRouterError,
  showLeaderboardWorkspace,
  showWorkspaceMode,
}: UseWorkspaceNavigationEffectsOptions): void {
  useEffect(() => {
    if (workspaceMode !== 'openrouter' || openRouterAccessState !== 'denied') return;
    showLeaderboardWorkspace();
    setOpenRouterError(openRouterAccessMessage);
  }, [openRouterAccessMessage, openRouterAccessState, setOpenRouterError, showLeaderboardWorkspace, workspaceMode]);

  useEffect(() => {
    if (sessions.length === 0) {
      if (activeSessionId) {
        setActiveSessionId('');
      }
      return;
    }

    if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions, setActiveSessionId]);

  useEffect(() => {
    if (isFocusedTrainingRoute) return;
    if (suppressSidebarAutoSelectRef.current) return;
    if (
      activeSession &&
      workspaceMode !== 'dashboard' &&
      workspaceMode !== 'adaptive-flow' &&
      workspaceMode !== 'admin' &&
      workspaceMode !== 'openrouter'
    ) {
      showWorkspaceMode(activeInputWorkspaceMode);
    }
  }, [activeInputWorkspaceMode, activeSession, isFocusedTrainingRoute, showWorkspaceMode, suppressSidebarAutoSelectRef, workspaceMode]);
}
