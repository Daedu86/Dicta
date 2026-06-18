import type { ComponentProps } from 'react';
import type { OpenRouterAccessState } from '../core/appProfiles';
import { PendingSessionLane } from '../components/training/PendingSessionLane';
import { OpenRouterWorkspace } from '../components/openrouter/OpenRouterWorkspace';
import { SessionDashboard } from '../components/session-dashboard/SessionDashboard';
import { AdaptiveBenchmarkSection } from '../components/adaptive-workspace/AdaptiveBenchmarkWorkspace';
import { AdaptiveAdvancedDiagnostics } from '../components/adaptive-workspace/AdaptiveAdvancedDiagnostics';
import type { LiveMetricsDockProps } from '../components/runtime-workspaces/LiveMetricsDock';
import { AdminWorkspace, type AdminWorkspaceProps } from '../components/admin/AdminWorkspace';
import type { StoredSession } from './sessionTypes';
import type { WorkspaceMode } from './useWorkspaceRouting';

type AdaptiveReportButtonProps = Pick<
  LiveMetricsDockProps,
  | 'metricsLanguageView'
  | 'insightsDiagnosticInputMode'
  | 'onCopyInsightsDiagnosticPackage'
  | 'formatInputModeLabel'
>;

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
  adaptiveReportButtonProps: AdaptiveReportButtonProps;
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
  adaptiveReportButtonProps,
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
                  className="secondary-button live-metrics-report-button"
                  onClick={() => void adaptiveReportButtonProps.onCopyInsightsDiagnosticPackage()}
                  title={`Copy one structured adaptive report for ${adaptiveReportButtonProps.formatInputModeLabel(adaptiveReportButtonProps.insightsDiagnosticInputMode)} / ${adaptiveReportButtonProps.metricsLanguageView.toUpperCase()}: summary, loop breakdown, planner/controller/runtime diagnostics, Browser TTS metadata, benchmark, feedback, and compact raw debug.`}
                >
                  Copy full adaptive report
                </button>
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
        ) : null}
      </section>
    </section>
  );
}
