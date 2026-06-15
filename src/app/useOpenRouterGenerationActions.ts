import { useCallback } from 'react';
import {
  useOpenRouterDirectGenerationRuntime,
  type OpenRouterGenerationBusyControls,
  type UseOpenRouterDirectGenerationRuntimeOptions,
} from './useOpenRouterDirectGenerationRuntime';
import { mapSessionInputMode } from './appRuntimeHelpers';

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
    fallbackInputMode,
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
    if (!activeSession) return;
    if (!allowCustomSessionGeneration) {
      setOpenRouterError('Custom session generation is available to admins only.');
      return;
    }
    if (!openRouterAccessAllowed) {
      setOpenRouterError(openRouterAccessMessage);
      return;
    }
    if (!ensureCanCreateDictationSession('openrouter')) return;
    if (!isOnline) {
      setOpenRouterError('OpenRouter needs internet. You can keep practicing offline; results are saved on this device and will sync when the connection returns.');
      return;
    }
    const inputMode = activeSession ? mapSessionInputMode(activeSession.inputMode) : fallbackInputMode;
    const language = dictaLanguageView;
    setSelectedBenchmarkInputMode(inputMode);
    setSelectedBenchmarkLanguage(language);
    setBenchmarkExportMessage('');
    setSessionFeedbackMessage('');
    showOpenRouterWorkspace();
    setOpenRouterGenerateFocusRequest((value) => value + 1);
  }, [
    activeSession,
    allowCustomSessionGeneration,
    dictaLanguageView,
    ensureCanCreateDictationSession,
    fallbackInputMode,
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
