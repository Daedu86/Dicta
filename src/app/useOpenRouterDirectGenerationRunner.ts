import { useCallback } from 'react';
import { runOpenRouterDirectGeneration } from './openRouterDirectGenerationRunExecutor';
import type {
  GenerateOpenRouterDirectSessionOptions,
  UseOpenRouterDirectGenerationRunnerOptions,
} from './openRouterDirectGenerationRunnerTypes';

export type {
  CreateGenerationErrorSessionArgs,
  GenerateOpenRouterDirectSessionOptions,
  UseOpenRouterDirectGenerationRunnerOptions,
} from './openRouterDirectGenerationRunnerTypes';

export function useOpenRouterDirectGenerationRunner({
  sessions,
  activeSession,
  openRouterAccessAllowed,
  openRouterAccessMessage,
  isOnline,
  effectiveOpenRouterDefaultModel,
  fallbackInputMode,
  dictaLanguageView,
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  recentDictationSessionHints,
  getAuthHeaders,
  ensureCanCreateDictationSession,
  setOpenRouterError,
  setSelectedBenchmarkInputMode,
  setSelectedBenchmarkLanguage,
  trackOpenRouterJob,
  recordOpenRouterGenerationFailure,
  createOpenRouterErrorSession,
}: UseOpenRouterDirectGenerationRunnerOptions) {
  return useCallback((generationOptions: GenerateOpenRouterDirectSessionOptions): Promise<void> => (
    runOpenRouterDirectGeneration({
      sessions,
      activeSession,
      openRouterAccessAllowed,
      openRouterAccessMessage,
      isOnline,
      effectiveOpenRouterDefaultModel,
      fallbackInputMode,
      dictaLanguageView,
      adaptiveBenchmarksByInputLanguage,
      adaptiveSessionFeedbackByInputLanguage,
      recentDictationSessionHints,
      getAuthHeaders,
      ensureCanCreateDictationSession,
      setOpenRouterError,
      setSelectedBenchmarkInputMode,
      setSelectedBenchmarkLanguage,
      trackOpenRouterJob,
      recordOpenRouterGenerationFailure,
      createOpenRouterErrorSession,
    }, generationOptions)
  ), [
    activeSession,
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    createOpenRouterErrorSession,
    dictaLanguageView,
    effectiveOpenRouterDefaultModel,
    ensureCanCreateDictationSession,
    fallbackInputMode,
    getAuthHeaders,
    isOnline,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    recentDictationSessionHints,
    recordOpenRouterGenerationFailure,
    sessions,
    setOpenRouterError,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    trackOpenRouterJob,
  ]);
}
