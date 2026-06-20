import {
  useOpenRouterDirectGenerationRunner,
  type UseOpenRouterDirectGenerationRunnerOptions,
} from './useOpenRouterDirectGenerationRunner';
import { useOpenRouterDirectGenerationPresetActions } from './useOpenRouterDirectGenerationPresetActions';

export type { CreateGenerationErrorSessionArgs } from './useOpenRouterDirectGenerationRunner';

export type OpenRouterGenerationBusyControls = {
  adaptiveOpenRouterBusy: boolean;
  setAdaptiveOpenRouterBusy: (value: boolean) => void;
  topicOpenRouterBusy: boolean;
  setTopicOpenRouterBusy: (value: boolean) => void;
};

export type UseOpenRouterDirectGenerationRuntimeOptions = OpenRouterGenerationBusyControls & UseOpenRouterDirectGenerationRunnerOptions;

export function useOpenRouterDirectGenerationRuntime({
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
  adaptiveOpenRouterBusy,
  setAdaptiveOpenRouterBusy,
  topicOpenRouterBusy,
  setTopicOpenRouterBusy,
}: UseOpenRouterDirectGenerationRuntimeOptions) {
  const generateDirectSessionFromOpenRouter = useOpenRouterDirectGenerationRunner({
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
  });

  return useOpenRouterDirectGenerationPresetActions({
    generateDirectSessionFromOpenRouter,
    adaptiveOpenRouterBusy,
    setAdaptiveOpenRouterBusy,
    topicOpenRouterBusy,
    setTopicOpenRouterBusy,
  });
}
