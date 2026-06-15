import { useOpenRouterGenerationBusyState } from './useOpenRouterGenerationBusyState';
import {
  useOpenRouterGenerationActions,
  type OpenRouterGenerationBusyControls,
  type UseOpenRouterGenerationActionsOptions,
} from './useOpenRouterGenerationActions';

type OpenRouterGenerationRuntimeActionOptions = Omit<
  UseOpenRouterGenerationActionsOptions,
  keyof OpenRouterGenerationBusyControls
>;

type UseOpenRouterGenerationRuntimeOptions = {
  access: Pick<
    OpenRouterGenerationRuntimeActionOptions,
    'allowCustomSessionGeneration' | 'openRouterAccessAllowed' | 'openRouterAccessMessage' | 'isOnline'
  >;
  sessionContext: Pick<
    OpenRouterGenerationRuntimeActionOptions,
    'sessions' | 'activeSession' | 'fallbackInputMode' | 'dictaLanguageView' | 'recentDictationSessionHints'
  >;
  generation: Pick<
    OpenRouterGenerationRuntimeActionOptions,
    'effectiveOpenRouterDefaultModel' | 'getAuthHeaders' | 'ensureCanCreateDictationSession'
  >;
  adaptiveContext: Pick<
    OpenRouterGenerationRuntimeActionOptions,
    'adaptiveBenchmarksByInputLanguage' | 'adaptiveSessionFeedbackByInputLanguage'
  >;
  presentationActions: Pick<
    OpenRouterGenerationRuntimeActionOptions,
    | 'showOpenRouterWorkspace'
    | 'setOpenRouterGenerateFocusRequest'
    | 'setOpenRouterError'
    | 'setSelectedBenchmarkInputMode'
    | 'setSelectedBenchmarkLanguage'
    | 'setBenchmarkExportMessage'
    | 'setSessionFeedbackMessage'
  >;
  jobActions: Pick<
    OpenRouterGenerationRuntimeActionOptions,
    'trackOpenRouterJob' | 'recordOpenRouterGenerationFailure' | 'createOpenRouterErrorSession'
  >;
};

export function useOpenRouterGenerationRuntime(options: UseOpenRouterGenerationRuntimeOptions) {
  const busyState = useOpenRouterGenerationBusyState();
  const generationActions = useOpenRouterGenerationActions({
    ...options.access,
    ...options.sessionContext,
    ...options.generation,
    ...options.adaptiveContext,
    ...options.presentationActions,
    ...options.jobActions,
    ...busyState,
  });

  return {
    ...busyState,
    ...generationActions,
  };
}
