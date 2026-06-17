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
  directOpenRouterBusy,
  directIntermediateOpenRouterBusy,
  directAdvancedOpenRouterBusy,
  generateEasyNextSessionFromOpenRouter,
  generateIntermediateNextSessionFromOpenRouter,
  generateAdvancedNextSessionFromOpenRouter,
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
    directOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
  });
}
