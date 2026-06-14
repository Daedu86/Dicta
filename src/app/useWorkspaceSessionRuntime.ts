import { useSessionWorkspaceActions } from './useSessionWorkspaceActions';
import { useWorkspaceSessionSummaries } from './useWorkspaceSessionSummaries';

type WorkspaceSessionSummariesOptions = Parameters<typeof useWorkspaceSessionSummaries>[0];
type SessionWorkspaceActionsOptions = Parameters<typeof useSessionWorkspaceActions>[0];

type UseWorkspaceSessionRuntimeOptions =
  WorkspaceSessionSummariesOptions &
  SessionWorkspaceActionsOptions;

export function useWorkspaceSessionRuntime(options: UseWorkspaceSessionRuntimeOptions) {
  const summaries = useWorkspaceSessionSummaries({
    sessions: options.sessions,
    activeSession: options.activeSession,
    adaptiveBenchmarksByInputLanguage: options.adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage: options.adaptiveSessionFeedbackByInputLanguage,
    supabaseLastSyncedAt: options.supabaseLastSyncedAt,
    leaderboardLanguageView: options.leaderboardLanguageView,
    adminLanguageView: options.adminLanguageView,
    adminProfileFilter: options.adminProfileFilter,
    adminRemoteSessions: options.adminRemoteSessions,
    metricsLanguageView: options.metricsLanguageView,
    metricsRangeView: options.metricsRangeView,
  });

  const workspaceActions = useSessionWorkspaceActions({
    dashboardSessionId: options.dashboardSessionId,
    workspaceMode: options.workspaceMode,
    clearDashboardSession: options.clearDashboardSession,
    showLeaderboardWorkspace: options.showLeaderboardWorkspace,
    deleteSessionAndSync: options.deleteSessionAndSync,
    setActiveSessionId: options.setActiveSessionId,
    showDashboardWorkspace: options.showDashboardWorkspace,
    showSessionInputWorkspace: options.showSessionInputWorkspace,
  });

  return {
    ...summaries,
    ...workspaceActions,
  };
}
