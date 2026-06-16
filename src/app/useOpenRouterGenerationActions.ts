import { useCallback } from 'react';
import {
  useOpenRouterDirectGenerationRuntime,
  type OpenRouterGenerationBusyControls,
  type UseOpenRouterDirectGenerationRuntimeOptions,
} from './useOpenRouterDirectGenerationRuntime';
import { buildOpenRouterGenerateWorkspacePlan } from './openRouterGenerateWorkspacePlan';

export type { OpenRouterGenerationBusyControls } from './useOpenRouterDirectGenerationRuntime';

export type UseOpenRouterGenerationActionsOptions = UseOpenRouterDirectGenerationRuntimeOptions & OpenRouterGenerationBusyControls & {
  allowCustomSessionGeneration: boolean;
  showOpenRouterWorkspace: () => void;
  setOpenRouterGenerateFocusRequest: (updater: (value: number) => number) => void;
  setBenchmarkExportMessage: (message: string) => void;
  setSessionFeedbackMessage: (message: string) => void;
};

export function useOpenRouterGenerationActions(options: UseOpenRouterGenerationActionsOptions) {
  const {
    activeSession,
    allowCustomSessionGeneration,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    isOnline,
    dictaLanguageView,
    ensureCanCreateDictationSession,
    showOpenRouterWorkspace,
    setOpenRouterGenerateFocusRequest,
    setOpenRouterError,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
  } = options;

  const directGenerationActions = useOpenRouterDirectGenerationRuntime(options);

  const openOpenRouterGenerateForActiveInput = useCallback((): void => {
    const plan = buildOpenRouterGenerateWorkspacePlan({
      activeSessionInputMode: activeSession?.inputMode ?? null,
      allowCustomSessionGeneration,
      openRouterAccessAllowed,
      openRouterAccessMessage,
      isOnline,
      dictaLanguageView,
    });

    if (plan.status === 'noop') return;
    if (plan.status === 'error') {
      setOpenRouterError(plan.message);
      return;
    }

    if (!ensureCanCreateDictationSession('openrouter')) return;
    if (plan.offlineErrorMessage) {
      setOpenRouterError(plan.offlineErrorMessage);
      return;
    }

    setSelectedBenchmarkInputMode(plan.inputMode);
    setSelectedBenchmarkLanguage(plan.language);
    setBenchmarkExportMessage('');
    setSessionFeedbackMessage('');
    showOpenRouterWorkspace();
    setOpenRouterGenerateFocusRequest((value) => value + 1);
  }, [
    activeSession,
    allowCustomSessionGeneration,
    dictaLanguageView,
    ensureCanCreateDictationSession,
    isOnline,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    setBenchmarkExportMessage,
    setOpenRouterError,
    setOpenRouterGenerateFocusRequest,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    setSessionFeedbackMessage,
    showOpenRouterWorkspace,
  ]);

  return {
    openOpenRouterGenerateForActiveInput,
    ...directGenerationActions,
  };
}
