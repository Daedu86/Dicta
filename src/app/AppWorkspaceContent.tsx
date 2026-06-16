import type { ComponentProps } from 'react';
import type { OpenRouterAccessState } from '../core/appProfiles';
import { PendingSessionLane } from '../components/training/PendingSessionLane';
import { OpenRouterWorkspace } from '../components/openrouter/OpenRouterWorkspace';
import { SessionDashboard } from '../components/session-dashboard/SessionDashboard';
import { AdaptiveBenchmarkSection } from '../components/adaptive-workspace/AdaptiveBenchmarkWorkspace';
import { AdaptiveAdvancedDiagnostics } from '../components/adaptive-workspace/AdaptiveAdvancedDiagnostics';
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
  adaptiveAdvancedDiagnosticsProps: ComponentProps<typeof AdaptiveAdvancedDiagnostics>;
  adaptiveBenchmarkSectionProps: ComponentProps<typeof AdaptiveBenchmarkSection>;
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
  adaptiveAdvancedDiagnosticsProps,
  adaptiveBenchmarkSectionProps,
  openRouterAccessState,
  openRouterAccessMessage,
  openRouterWorkspaceProps,
  canAccessAdminWorkspace,
  adminWorkspaceProps,
}: AppWorkspaceContentProps) {
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
        ) : workspaceMode === 'adaptive' ? (
          <section className="panel workspace-panel adaptive-workspace">
            <div className="tts-workspace-header">
              <div>
                <p className="dashboard-eyebrow">Adaptive cockpit</p>
                <h2>Adaptive Pace Layer</h2>
              </div>
              <div className="dashboard-header-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onBackToTraining}
                >
                  Back to training
                </button>
              </div>
            </div>
            <div className="adaptive-workspace-grid">
              <AdaptiveAdvancedDiagnostics {...adaptiveAdvancedDiagnosticsProps} />
              <AdaptiveBenchmarkSection {...adaptiveBenchmarkSectionProps} />
            </div>
          </section>
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
        ) : (
          <section className="panel workspace-panel">
            <p className="hint">Choose Browser TTS to train.</p>
          </section>
        )}
      </section>
    </section>
  );
}
