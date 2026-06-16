import type { DictaRuntimeRootEnvironment } from './useDictaRuntimeRootEnvironment';
import { useDictaRootPersistenceRuntime } from './useDictaRootPersistenceRuntime';
import { useSessionCreationRuntime } from './useSessionCreationRuntime';
import { useTtsSessionRuntime } from './useTtsSessionRuntime';

type UseDictaRuntimeRootSessionGraphOptions = {
  environment: DictaRuntimeRootEnvironment;
};

export function useDictaRuntimeRootSessionGraph({
  environment,
}: UseDictaRuntimeRootSessionGraphOptions) {
  const {
    sessionsState,
    trainingState,
    routing,
    browserTts,
    refs,
    accessRuntime,
    uiPreferences,
    adaptiveWorkspaceState,
  } = environment;
  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
  } = sessionsState;
  const {
    difficulty,
    sessionStatus,
    setError,
    setExportMessage,
    ttsLanguage,
    ttsPracticeText,
  } = trainingState;
  const {
    dashboardSessionId,
    clearDashboardSession,
    showLeaderboardWorkspace,
    showSessionInputWorkspace,
  } = routing;
  const { browserTtsVoices } = browserTts;
  const { suppressSidebarAutoSelectRef } = refs;
  const {
    syncConfig,
    supabaseClient,
    effectiveProfileId,
    appProfile,
    setOpenRouterError,
  } = accessRuntime;
  const { setLeaderboardLanguageView } = uiPreferences;
  const {
    adaptiveBenchmarksByInputLanguage,
    setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
  } = adaptiveWorkspaceState;

  const persistenceRuntime = useDictaRootPersistenceRuntime({
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    syncConfig,
    supabaseClient,
    effectiveProfileId,
    appProfile,
    adaptiveBenchmarks: adaptiveBenchmarksByInputLanguage,
    setAdaptiveBenchmarks: setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedback: adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedback: setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    setError,
    setOpenRouterError,
    setExportMessage,
    clearDashboardSession,
  });

  const sessionCreationRuntime = useSessionCreationRuntime({
    browserTtsVoices,
    suppressSidebarAutoSelectRef,
    ensureCanCreateDictationSession: persistenceRuntime.ensureCanCreateDictationSession,
    prependSessionAndPersistNow: persistenceRuntime.prependSessionAndPersistNow,
    showSessionInputWorkspace,
    showLeaderboardWorkspace,
    setActiveSessionId,
    setLeaderboardLanguageView,
    setError,
    setOpenRouterError,
    setExportMessage,
  });

  const ttsSessionRuntime = useTtsSessionRuntime({
    ttsPracticeText,
    sessions,
    activeSessionId,
    dashboardSessionId,
    difficulty,
    sessionStatus,
    browserTtsVoices,
    setSessions,
    ttsLanguage,
  });

  return {
    persistenceRuntime,
    sessionCreationRuntime,
    ttsSessionRuntime,
  };
}

export type DictaRuntimeRootSessionGraph = ReturnType<typeof useDictaRuntimeRootSessionGraph>;
