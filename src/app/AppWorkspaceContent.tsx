import type { ComponentProps } from 'react';
import type { OpenRouterAccessState } from '../core/appProfiles';
import { PendingSessionLane } from '../components/training/PendingSessionLane';
import { OpenRouterWorkspace } from '../components/openrouter/OpenRouterWorkspace';
import { SessionDashboard } from '../components/session-dashboard/SessionDashboard';
import { AdaptivePaceLayerFlowWorkspace } from '../components/adaptive-workspace/AdaptivePaceLayerFlowWorkspace';
import { AdminWorkspace, type AdminWorkspaceProps } from '../components/admin/AdminWorkspace';
import type { StoredSession } from './sessionTypes';
import type { WorkspaceMode } from './useWorkspaceRouting';

type AppWorkspaceContentProps = {
  pendingSessions: StoredSession[];
  activeSessionId: string;
  onOpenPendingSession: (session: StoredSession) => void;
  onDeleteSession: (sessionId: string) => void;
  workspaceMode: WorkspaceMode;
  dashboardSession: StoredSession | null;
  sessions: StoredSession[];
  formatSessionStatus: (status: StoredSession['status']) => string;
  formatSessionDate: (value: string) => string;
  formatSessionPlaybackDuration: (session: StoredSession) => string;
  onBackToTraining: () => void;
  openRouterAccessState: OpenRouterAccessState;
  openRouterAccessMessage: string;
  openRouterWorkspaceProps: ComponentProps<typeof OpenRouterWorkspace>;
  canAccessAdminWorkspace: boolean;
  adminWorkspaceProps: AdminWorkspaceProps<StoredSession>;
};

export function AppWorkspaceContent({
  pendingSessions,
  activeSessionId,
  onOpenPendingSession,
  onDeleteSession,
  workspaceMode,
  dashboardSession,
  sessions,
  formatSessionStatus,
  formatSessionDate,
  formatSessionPlaybackDuration,
  onBackToTraining,
  openRouterAccessState,
  openRouterAccessMessage,
  openRouterWorkspaceProps,
  canAccessAdminWorkspace,
  adminWorkspaceProps,
}: AppWorkspaceContentProps) {
  if (workspaceMode === 'adaptive-flow') {
    return (
      <section className="workspace">
        <section className="workspace-shell">
          <AdaptivePaceLayerFlowWorkspace />
        </section>
      </section>
    );
  }

  return (
    <section className="workspace">
      <section className="workspace-shell">
        <PendingSessionLane
          sessions={pendingSessions}
          activeSessionId={activeSessionId}
          onOpenSession={onOpenPendingSession}
          onDeleteSession={onDeleteSession}
        />
        {workspaceMode === 'dashboard' && dashboardSession ? (
          <SessionDashboard
            session={dashboardSession}
            sessions={sessions}
            formatSessionStatus={formatSessionStatus}
            formatSessionDate={formatSessionDate}
            formatSessionPlaybackDuration={formatSessionPlaybackDuration}
            onBackToTraining={onBackToTraining}
          />
        ) : workspaceMode === 'openrouter' ? (
          openRouterAccessState !== 'allowed' ? (
            <section className="panel workspace-panel">
              <p className={openRouterAccessState === 'pending' ? 'hint' : 'error'}>
                {openRouterAccessState === 'pending' ? 'Checking OpenRouter access...' : openRouterAccessMessage}
              </p>
            </section>
          ) : (
            <OpenRouterWorkspace {...openRouterWorkspaceProps} />
          )
        ) : workspaceMode === 'admin' ? (
          canAccessAdminWorkspace ? <AdminWorkspace {...adminWorkspaceProps} /> : (
            <section className="panel workspace-panel">
              <p className="error">Admin access required.</p>
            </section>
          )
        ) : null}
      </section>
    </section>
  );
}
