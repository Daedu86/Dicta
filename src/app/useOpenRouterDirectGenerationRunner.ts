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

export function useOpenRouterDirectGenerationRunner(options: UseOpenRouterDirectGenerationRunnerOptions) {
  const {
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
  } = options;

  return useCallback((generationOptions: GenerateOpenRouterDirectSessionOptions): Promise<void> => (
    runOpenRouterDirectGeneration(options, generationOptions)
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
