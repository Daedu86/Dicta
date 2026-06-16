import { useDictaRootAdaptiveRuntime } from './useDictaRootAdaptiveRuntime';
import { useDictaRootWorkspaceSessionRuntime } from './useDictaRootWorkspaceSessionRuntime';
import type { DictaRuntimeRootEnvironment } from './useDictaRuntimeRootEnvironment';
import type { DictaRuntimeRootSessionGraph } from './useDictaRuntimeRootSessionGraph';
import { isMobileViewport } from './viewport';

type UseDictaRuntimeRootAdaptiveWorkspaceGraphOptions = {
  environment: DictaRuntimeRootEnvironment;
  sessionGraph: DictaRuntimeRootSessionGraph;
};

export function useDictaRuntimeRootAdaptiveWorkspaceGraph({
  environment,
  sessionGraph,
}: UseDictaRuntimeRootAdaptiveWorkspaceGraphOptions) {
  const {
    perfDiagnosticsEnabled,
    sessionsState,
    routing,
    refs,
    accessRuntime,
    uiPreferences,
    adaptiveWorkspaceState,
  } = environment;
  const { sessions, activeSessionId, setActiveSessionId } = sessionsState;
  const {
    workspaceMode,
    dashboardSessionId,
    clearDashboardSession,
    showWorkspaceMode,
    showLeaderboardWorkspace,
    showAdaptiveWorkspace,
    showDashboardWorkspace,
    showSessionInputWorkspace,
  } = routing;
  const { suppressSidebarAutoSelectRef } = refs;
  const {
    openRouterAccessState,
    openRouterAccessMessage,
    setOpenRouterError,
    adminProfileFilter,
    adminRemoteSessions,
  } = accessRuntime;
  const {
    dictaLanguageView,
    setDictaLanguageView,
    metricsLanguageView,
    leaderboardLanguageView,
    adminLanguageView,
    metricsRangeView,
    setAdaptiveSectionExpanded,
  } = uiPreferences;
  const {
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
  } = adaptiveWorkspaceState;
  const {
    persistenceRuntime,
    ttsSessionRuntime,
  } = sessionGraph;
  const {
    localStorageReadyForEffectiveProfile,
    supabaseSyncStatus,
    persistAndPushAdaptiveSessionFeedbackNow,
    deleteSessionAndSync,
  } = persistenceRuntime;
  const {
    activeSession,
    activeInputWorkspaceMode,
  } = ttsSessionRuntime;

  const adaptiveRuntime = useDictaRootAdaptiveRuntime({
    activeSession,
    activeSessionId,
    sessions,
    adaptiveWorkspaceState,
    persistAndPushAdaptiveSessionFeedbackNow,
    localStorageReadyForEffectiveProfile,
    perfDiagnosticsEnabled,
    dictaLanguageView,
    setDictaLanguageView,
    showAdaptiveWorkspace,
    setAdaptiveSectionExpanded,
    isMobileViewport,
  });

  const workspaceSessionRuntime = useDictaRootWorkspaceSessionRuntime({
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
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    supabaseLastSyncedAt: supabaseSyncStatus.lastSyncedAt,
    leaderboardLanguageView,
    adminLanguageView,
    adminProfileFilter,
    adminRemoteSessions,
    metricsLanguageView,
    metricsRangeView,
    dashboardSessionId,
    clearDashboardSession,
    deleteSessionAndSync,
    showDashboardWorkspace,
    showSessionInputWorkspace,
  });

  return {
    adaptiveRuntime,
    workspaceSessionRuntime,
  };
}

export type DictaRuntimeRootAdaptiveWorkspaceGraph = ReturnType<
  typeof useDictaRuntimeRootAdaptiveWorkspaceGraph
>;
