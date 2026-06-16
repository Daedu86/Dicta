import { useDictaLocalStorageImportRuntime } from './useDictaLocalStorageImportRuntime';
import { useDictaRootRouteCompositionRuntime } from './useDictaRootRouteCompositionRuntime';
import { buildDictaRuntimeRootRouteCompositionInput } from './dictaRuntimeRootRouteCompositionInput';
import type { DictaRuntimeRootAdaptiveWorkspaceGraph } from './useDictaRuntimeRootAdaptiveWorkspaceGraph';
import type { DictaRuntimeRootEnvironment } from './useDictaRuntimeRootEnvironment';
import type { DictaRuntimeRootFocusedTrainingGraph } from './useDictaRuntimeRootFocusedTrainingGraph';
import type { DictaRuntimeRootOpenRouterGraph } from './useDictaRuntimeRootOpenRouterGraph';
import type { DictaRuntimeRootSessionGraph } from './useDictaRuntimeRootSessionGraph';
import { formatSessionDate } from './sessionDateFormatters';
import { formatSessionPlaybackDuration } from './sessionPlaybackDuration';
import { formatSessionStatus } from './sessionStatusFormatters';

type UseDictaRuntimeRootPresentationGraphOptions = {
  environment: DictaRuntimeRootEnvironment;
  sessionGraph: DictaRuntimeRootSessionGraph;
  adaptiveWorkspaceGraph: DictaRuntimeRootAdaptiveWorkspaceGraph;
  openRouterGraph: DictaRuntimeRootOpenRouterGraph;
  focusedTrainingGraph: DictaRuntimeRootFocusedTrainingGraph;
  localDevFeaturesAvailable: boolean;
};

export function useDictaRuntimeRootPresentationGraph({
  environment,
  sessionGraph,
  adaptiveWorkspaceGraph,
  openRouterGraph,
  focusedTrainingGraph,
  localDevFeaturesAvailable,
}: UseDictaRuntimeRootPresentationGraphOptions) {
  const {
    perfDiagnosticsEnabled,
    sessionsState,
    trainingState,
    routing,
    theme,
    accessRuntime,
    uiPreferences,
    adaptiveWorkspaceState,
  } = environment;

  const { sessions, setSessions, activeSessionId, setActiveSessionId } = sessionsState;
  const { workspaceMode, navigateAppRoute, showLeaderboardWorkspace, clearDashboardSession } = routing;
  const { themeMode } = theme;

  const {
    syncConfig,
    authSession,
    authLoading,
    authView,
    appProfile,
    appProfileError,
    openRouterAccessState,
    openRouterAccessMessage,
    setOpenRouterDefaultModel,
  } = accessRuntime;

  const { dictaLanguageView, setDictaLanguageView } = uiPreferences;

  const {
    setAdaptiveBenchmarksByInputLanguage,
    setAdaptiveSessionFeedbackByInputLanguage,
  } = adaptiveWorkspaceState;

  const { persistenceRuntime, sessionCreationRuntime, ttsSessionRuntime } = sessionGraph;
  const { localStorageReadyForEffectiveProfile, supabaseInitialSyncPending } = persistenceRuntime;
  const { sessionCreationMode } = sessionCreationRuntime;
  const { dashboardSession } = ttsSessionRuntime;

  const { workspaceSessionRuntime } = adaptiveWorkspaceGraph;
  const { pendingSessions, deleteSession, openWorkspaceForSession } = workspaceSessionRuntime;

  const { focusedTrainingProps } = focusedTrainingGraph;

  const { importDictaLocalStorageSnapshot } = useDictaLocalStorageImportRuntime({
    setSessions,
    setActiveSessionId,
    clearDashboardSession,
    setAdaptiveBenchmarksByInputLanguage,
    setAdaptiveSessionFeedbackByInputLanguage,
    setDictaLanguageView,
    setOpenRouterDefaultModel,
    showLeaderboardWorkspace,
    setExportMessage: trainingState.setExportMessage,
  });

  const routeCompositionRuntime = useDictaRootRouteCompositionRuntime(
    buildDictaRuntimeRootRouteCompositionInput({
      environment,
      sessionGraph,
      adaptiveWorkspaceGraph,
      openRouterGraph,
      focusedTrainingGraph,
      localDevFeaturesAvailable,
      importDictaLocalStorageSnapshot,
    }),
  );

  return {
    appRouteRendererProps: {
      syncAuthRequired: syncConfig.authRequired,
      authLoading,
      authView,
      authSession,
      appProfile,
      appProfileError,
      localStorageReadyForEffectiveProfile,
      supabaseInitialSyncPending,
      authWorkspaceProps: routeCompositionRuntime.authWorkspaceProps,
      isFocusedTrainingRoute: routeCompositionRuntime.isFocusedTrainingRoute,
      themeMode,
      dictaLanguageView,
      setDictaLanguageView,
      navigateAppRoute,
      focusedTrainingProps,
      perfDiagnosticsEnabled,
      appShellHeaderProps: routeCompositionRuntime.appShellHeaderProps,
      sessionCreationMode,
      sessionCreateCardProps: routeCompositionRuntime.sessionCreateCardProps,
      pendingSessions,
      activeSessionId,
      openWorkspaceForSession,
      deleteSession,
      workspaceMode,
      dashboardSession,
      sessions,
      formatSessionStatus,
      formatSessionDate,
      formatSessionPlaybackDuration,
      showLeaderboardWorkspace,
      adaptiveAdvancedDiagnosticsProps: routeCompositionRuntime.adaptiveAdvancedDiagnosticsProps,
      adaptiveBenchmarkSectionProps: routeCompositionRuntime.adaptiveBenchmarkSectionProps,
      openRouterAccessState,
      openRouterAccessMessage,
      openRouterWorkspaceProps: routeCompositionRuntime.openRouterWorkspaceProps,
      canAccessAdminWorkspace: openRouterGraph.allowCustomSessionGeneration,
      adminWorkspaceProps: routeCompositionRuntime.adminWorkspaceProps,
      leaderboardWorkspaceProps: routeCompositionRuntime.leaderboardWorkspaceProps,
      liveMetricsDockProps: routeCompositionRuntime.liveMetricsDockProps,
    },
  };
}

export type DictaRuntimeRootPresentationGraph = ReturnType<typeof useDictaRuntimeRootPresentationGraph>;
