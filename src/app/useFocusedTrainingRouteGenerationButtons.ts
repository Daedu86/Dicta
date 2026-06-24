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
  cancelOpenRouterJob,
  adaptiveOpenRouterBusy,
  topicOpenRouterBusy,
  directGenerationDurationMinutes,
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
    cancelOpenRouterJob,
    adaptiveOpenRouterBusy,
    topicOpenRouterBusy,
    directGenerationDurationMinutes,
    generateAdaptiveNextSessionFromOpenRouter,
    generateTopicNextSessionFromOpenRouter,
  });
}
