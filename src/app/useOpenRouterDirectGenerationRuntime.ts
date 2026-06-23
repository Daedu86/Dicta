import {
  useOpenRouterDirectGenerationRunner,
  type UseOpenRouterDirectGenerationRunnerOptions,
} from './useOpenRouterDirectGenerationRunner';
import { useOpenRouterDirectGenerationPresetActions } from './useOpenRouterDirectGenerationPresetActions';
import type { OpenRouterDirectGenerationPreset } from './openRouterDirectGenerationPresets';

export type { CreateGenerationErrorSessionArgs } from './useOpenRouterDirectGenerationRunner';

export type OpenRouterGenerationBusyControls = {
  adaptiveOpenRouterBusy: boolean;
  setAdaptiveOpenRouterBusy: (value: boolean) => void;
  topicOpenRouterBusy: boolean;
  setTopicOpenRouterBusy: (value: boolean) => void;
};

export type UseOpenRouterDirectGenerationRuntimeOptions = OpenRouterGenerationBusyControls &
  UseOpenRouterDirectGenerationRunnerOptions & {
    directGenerationDurationMinutes: OpenRouterDirectGenerationPreset['durationMinutes'];
  };
export type { OpenRouterDirectGenerationActionOptions } from './openRouterDirectGenerationRunnerTypes';

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
  directGenerationDurationMinutes,
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
    directGenerationDurationMinutes,
    adaptiveOpenRouterBusy,
    setAdaptiveOpenRouterBusy,
    topicOpenRouterBusy,
    setTopicOpenRouterBusy,
  });
}
