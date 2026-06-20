import { useFocusedTrainingGenerationButtons } from './useFocusedTrainingGenerationButtons';
import type { UseFocusedTrainingRouteRuntimeArgs } from './useFocusedTrainingRouteRuntimeTypes';

export function useFocusedTrainingRouteGenerationButtons({
  openRouterAccessAllowed,
  isOnline,
  activeSession,
  effectiveOpenRouterDefaultModel,
  sessionQuotaStatus,
  openRouterOfflineTitle,
  activeOpenRouterJobs,
  openRouterJobNotifications,
  trainingGenerationNotices,
  trainingGenerationNowMs,
  adaptiveOpenRouterBusy,
  topicOpenRouterBusy,
  generateAdaptiveNextSessionFromOpenRouter,
  generateTopicNextSessionFromOpenRouter,
}: UseFocusedTrainingRouteRuntimeArgs) {
  return useFocusedTrainingGenerationButtons({
    openRouterAccessAllowed,
    isOnline,
    activeSession,
    effectiveOpenRouterDefaultModel,
    sessionQuotaStatus,
    openRouterOfflineTitle,
    activeOpenRouterJobs,
    openRouterJobNotifications,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    adaptiveOpenRouterBusy,
    topicOpenRouterBusy,
    generateAdaptiveNextSessionFromOpenRouter,
    generateTopicNextSessionFromOpenRouter,
  });
}
