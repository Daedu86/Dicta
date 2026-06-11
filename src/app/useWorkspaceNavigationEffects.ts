import { useEffect } from 'react';
import type { WorkspaceMode } from './useWorkspaceRouting';
import type { StoredSession } from './sessionTypes';

interface UseWorkspaceNavigationEffectsOptions {
  sessions: StoredSession[];
  activeSession: StoredSession | null;
  activeSessionId: string;
  activeInputWorkspaceMode: WorkspaceMode;
  workspaceMode: WorkspaceMode;
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
    if (suppressSidebarAutoSelectRef.current) return;
    if (
      activeSession &&
      workspaceMode !== 'leaderboard' &&
      workspaceMode !== 'dashboard' &&
      workspaceMode !== 'adaptive' &&
      workspaceMode !== 'admin' &&
      workspaceMode !== 'openrouter' &&
      workspaceMode !== 'ollama'
    ) {
      showWorkspaceMode(activeInputWorkspaceMode);
    }
  }, [activeInputWorkspaceMode, activeSession, showWorkspaceMode, suppressSidebarAutoSelectRef, workspaceMode]);
}
