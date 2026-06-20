import { useDictaRootFocusedTrainingRuntime } from './useDictaRootFocusedTrainingRuntime';
import type { DictaRuntimeRootAdaptiveWorkspaceGraph } from './useDictaRuntimeRootAdaptiveWorkspaceGraph';
import type { DictaRuntimeRootEnvironment } from './useDictaRuntimeRootEnvironment';
import type { DictaRuntimeRootOpenRouterGraph } from './useDictaRuntimeRootOpenRouterGraph';
import type { DictaRuntimeRootSessionGraph } from './useDictaRuntimeRootSessionGraph';

type UseDictaRuntimeRootFocusedTrainingGraphOptions = {
  environment: DictaRuntimeRootEnvironment;
  sessionGraph: DictaRuntimeRootSessionGraph;
  adaptiveWorkspaceGraph: DictaRuntimeRootAdaptiveWorkspaceGraph;
  openRouterGraph: DictaRuntimeRootOpenRouterGraph;
};

export function useDictaRuntimeRootFocusedTrainingGraph({
  environment,
  sessionGraph,
  adaptiveWorkspaceGraph,
  openRouterGraph,
}: UseDictaRuntimeRootFocusedTrainingGraphOptions) {
  const {
    sessionsState,
    trainingState,
    browserTts,
    refs,
    accessRuntime,
    adaptiveWorkspaceState,
  } = environment;
  const {
    persistenceRuntime,
    ttsSessionRuntime,
  } = sessionGraph;
  const {
    adaptiveRuntime,
    workspaceSessionRuntime,
  } = adaptiveWorkspaceGraph;
  const {
    resetAdaptiveSessionFeedbackTracking,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
    getAdaptiveController,
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    recordAdaptiveBenchmark,
    completeAdaptiveSessionFeedback,
  } = adaptiveRuntime;
  const {
    activeTrainingSubmissionMeta,
    pendingSessions,
    openWorkspaceForSession,
    deleteSession,
    pendingSyncSummary,
  } = workspaceSessionRuntime;
  const {
    persistAndPushSessionsNow,
    supabaseSyncStatus,
    sessionQuotaStatus,
  } = persistenceRuntime;

  return useDictaRootFocusedTrainingRuntime({
    ttsSessionRuntime,
    ...sessionsState,
    ...trainingState,
    ...refs,
    ...browserTts,
    resetAdaptiveSessionFeedbackTracking,
    getHistoricalPerformanceProfile,
    getBenchmarkSnapshot,
    getAdaptiveController,
    beginAdaptiveSessionFeedback,
    recordPhrasePlaybackEvent,
    recordAdaptiveBenchmark,
    setAdaptiveSemanticDebug: adaptiveWorkspaceState.setAdaptiveSemanticDebug,
    completeAdaptiveSessionFeedback,
    adaptiveSemanticDebug: adaptiveWorkspaceState.adaptiveSemanticDebug,
    persistAndPushSessionsNow,
    supabaseSyncStatus,
    activeTrainingSubmissionMeta,
    pendingSessions,
    openWorkspaceForSession,
    deleteSession,
    pendingSyncSummary,
    openRouterAccessAllowed: accessRuntime.openRouterAccessAllowed,
    effectiveOpenRouterDefaultModel: accessRuntime.effectiveOpenRouterDefaultModel,
    sessionQuotaStatus,
    openRouterJobStatus: openRouterGraph.openRouterJobStatus,
    openRouterError: accessRuntime.openRouterError,
    isOnline: openRouterGraph.isOnline,
    openRouterOfflineTitle: openRouterGraph.openRouterOfflineTitle,
    activeOpenRouterJobs: openRouterGraph.activeOpenRouterJobs,
    openRouterJobNotifications: openRouterGraph.openRouterJobNotifications,
    trainingGenerationNotices: openRouterGraph.trainingGenerationNotices,
    trainingGenerationNowMs: openRouterGraph.trainingGenerationNowMs,
    adaptiveOpenRouterBusy: openRouterGraph.adaptiveOpenRouterBusy,
    topicOpenRouterBusy: openRouterGraph.topicOpenRouterBusy,
    generateAdaptiveNextSessionFromOpenRouter: openRouterGraph.generateAdaptiveNextSessionFromOpenRouter,
    generateTopicNextSessionFromOpenRouter: openRouterGraph.generateTopicNextSessionFromOpenRouter,
  });
}

export type DictaRuntimeRootFocusedTrainingGraph = ReturnType<
  typeof useDictaRuntimeRootFocusedTrainingGraph
>;
