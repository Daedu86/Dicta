import { useEffect, useMemo } from 'react';
import type { OpenRouterWorkspaceProps } from './types';
import { isSupportedLanguage } from '../../core/languages';
import { buildOpenRouterModelOptions } from './openRouterViewHelpers';
import {
  OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS,
  OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS,
  buildOpenRouterWorkspaceExportPayloads,
  formatOpenRouterPromptSizeHint,
} from './openRouterWorkspaceRuntimeHelpers';
import { useOpenRouterWorkspaceClipboard } from './useOpenRouterWorkspaceClipboard';
import { useOpenRouterWorkspaceUiState } from './useOpenRouterWorkspaceUiState';

export function useOpenRouterWorkspaceRuntime({
  defaultModel,
  assignedModel,
  models,
  exportProfile,
  exportSessionFeedback,
  exportActiveSessionStatus,
}: OpenRouterWorkspaceProps) {
  const uiState = useOpenRouterWorkspaceUiState({
    defaultModel,
  });

  const modelSelectionLocked = Boolean(assignedModel);
  const modelOptions = useMemo(
    () => buildOpenRouterModelOptions(models, [defaultModel, assignedModel]),
    [assignedModel, defaultModel, models],
  );

  const exportPayloads = useMemo(
    () =>
      buildOpenRouterWorkspaceExportPayloads({
        exportActiveSessionStatus,
        exportProfile,
        exportSessionFeedback,
        humanFeedbackDraft: uiState.humanFeedbackDraft,
      }),
    [exportActiveSessionStatus, exportProfile, exportSessionFeedback, uiState.humanFeedbackDraft],
  );

  const exportHasBenchmarkData = exportProfile.sampleCount > 0 || exportProfile.sessionCount > 0;
  const exportHasSessionFeedback = Boolean(exportSessionFeedback);
  const exportLanguage = isSupportedLanguage(exportProfile.language) ? exportProfile.language : 'en';

  const copyToClipboard = useOpenRouterWorkspaceClipboard({
    exportProfile,
    setExportStatusMessage: uiState.setExportStatusMessage,
  });

  useEffect(() => {
    uiState.setSelectedModel(defaultModel);
  }, [defaultModel]);

  return {
    ...uiState,
    modelSelectionLocked,
    modelOptions,
    copyToClipboard,
    formatPromptSizeHint: formatOpenRouterPromptSizeHint,
    exportPayloads,
    exportHasBenchmarkData,
    exportHasSessionFeedback,
    exportLanguage,
    profileInputModeOptions: OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS,
    profileLanguageOptions: OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS,
  };
}
