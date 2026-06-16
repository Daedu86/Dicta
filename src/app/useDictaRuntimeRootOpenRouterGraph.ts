import { useDictaRootOpenRouterRuntime } from './useDictaRootOpenRouterRuntime';
import type { DictaRuntimeRootAdaptiveWorkspaceGraph } from './useDictaRuntimeRootAdaptiveWorkspaceGraph';
import type { DictaRuntimeRootEnvironment } from './useDictaRuntimeRootEnvironment';
import type { DictaRuntimeRootSessionGraph } from './useDictaRuntimeRootSessionGraph';

type UseDictaRuntimeRootOpenRouterGraphOptions = {
  environment: DictaRuntimeRootEnvironment;
  sessionGraph: DictaRuntimeRootSessionGraph;
  adaptiveWorkspaceGraph: DictaRuntimeRootAdaptiveWorkspaceGraph;
};

export function useDictaRuntimeRootOpenRouterGraph({
  environment,
  sessionGraph,
  adaptiveWorkspaceGraph,
}: UseDictaRuntimeRootOpenRouterGraphOptions) {
  const {
    sessionsState,
    trainingState,
    routing,
    refs,
    accessRuntime,
    uiPreferences,
    adaptiveWorkspaceState,
  } = environment;
  const { sessions, setActiveSessionId } = sessionsState;
  const { setError } = trainingState;
  const { showLeaderboardWorkspace, showOpenRouterWorkspace } = routing;
  const { suppressSidebarAutoSelectRef } = refs;
  const { setLeaderboardLanguageView } = uiPreferences;
  const {
    syncConfig,
    getAuthHeaders,
    isCurrentProfileAdmin,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    effectiveOpenRouterDefaultModel,
    setOpenRouterError,
  } = accessRuntime;
  const {
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
  } = adaptiveWorkspaceState;
  const {
    persistenceRuntime,
    sessionCreationRuntime,
    ttsSessionRuntime,
  } = sessionGraph;
  const {
    ensureCanCreateDictationSession,
    prependSessionAndPersistNow,
    localStorageReadyForEffectiveProfile,
    resetOpenRouterJobsRuntimeRef,
  } = persistenceRuntime;
  const {
    openRouterGenerateFocusRequest,
    setOpenRouterGenerateFocusRequest,
    createSessionFromOpenRouterScript,
  } = sessionCreationRuntime;
  const {
    activeSession,
    activeInputMode,
  } = ttsSessionRuntime;
  const {
    adaptiveRuntime,
    workspaceSessionRuntime,
  } = adaptiveWorkspaceGraph;
  const {
    selectedBenchmarkInputMode,
    setSelectedBenchmarkInputMode,
    selectedBenchmarkLanguage,
    setSelectedBenchmarkLanguage,
  } = adaptiveRuntime;
  const { recentDictationSessionHints } = workspaceSessionRuntime;
  const allowCustomSessionGeneration = isCurrentProfileAdmin || !syncConfig.authRequired;

  const openRouterRuntime = useDictaRootOpenRouterRuntime({
    errorSessionActions: {
      ensureCanCreateDictationSession,
      suppressSidebarAutoSelectRef,
      prependSessionAndPersistNow,
      setLeaderboardLanguageView,
      setActiveSessionId,
      showLeaderboardWorkspace,
      setError,
      setOpenRouterError,
    },
    generatedScriptSettlement: {
      createSessionFromOpenRouterScript,
    },
    jobs: {
      localStorageReady: localStorageReadyForEffectiveProfile,
      openRouterAccessAllowed,
      getAuthHeaders,
      onOpenRouterError: setOpenRouterError,
    },
    access: {
      allowCustomSessionGeneration,
      openRouterAccessAllowed,
      openRouterAccessMessage,
    },
    sessionContext: {
      sessions,
      activeSession,
      activeInputMode,
      dictaLanguageView: uiPreferences.dictaLanguageView,
      recentDictationSessionHints,
    },
    generation: {
      effectiveOpenRouterDefaultModel,
      getAuthHeaders,
      ensureCanCreateDictationSession,
    },
    adaptiveContext: {
      adaptiveBenchmarksByInputLanguage,
      adaptiveSessionFeedbackByInputLanguage,
    },
    presentationActions: {
      showOpenRouterWorkspace,
      setOpenRouterGenerateFocusRequest,
      setOpenRouterError,
      setSelectedBenchmarkInputMode,
      setSelectedBenchmarkLanguage,
      setBenchmarkExportMessage,
      setSessionFeedbackMessage,
    },
    resetOpenRouterJobsRuntimeRef,
  });

  return {
    ...openRouterRuntime,
    allowCustomSessionGeneration,
    openRouterGenerateFocusRequest,
    selectedBenchmarkInputMode,
    selectedBenchmarkLanguage,
  };
}

export type DictaRuntimeRootOpenRouterGraph = ReturnType<typeof useDictaRuntimeRootOpenRouterGraph>;
