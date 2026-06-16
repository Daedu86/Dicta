import {
  useOpenRouterDirectGenerationRunner,
  type UseOpenRouterDirectGenerationRunnerOptions,
} from './useOpenRouterDirectGenerationRunner';
import { useOpenRouterDirectGenerationPresetActions } from './useOpenRouterDirectGenerationPresetActions';

export type { CreateGenerationErrorSessionArgs } from './useOpenRouterDirectGenerationRunner';

export type OpenRouterGenerationBusyControls = {
  directOpenRouterBusy: boolean;
  setDirectOpenRouterBusy: (value: boolean) => void;
  directIntermediateOpenRouterBusy: boolean;
  setDirectIntermediateOpenRouterBusy: (value: boolean) => void;
  directAdvancedOpenRouterBusy: boolean;
  setDirectAdvancedOpenRouterBusy: (value: boolean) => void;
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
  directOpenRouterBusy,
  setDirectOpenRouterBusy,
  directIntermediateOpenRouterBusy,
  setDirectIntermediateOpenRouterBusy,
  directAdvancedOpenRouterBusy,
  setDirectAdvancedOpenRouterBusy,
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

  const presetActions = useOpenRouterDirectGenerationPresetActions({
    generateDirectSessionFromOpenRouter,
    directOpenRouterBusy,
    setDirectOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    setDirectIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    setDirectAdvancedOpenRouterBusy,
  });

  return presetActions;
}
