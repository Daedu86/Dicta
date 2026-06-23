import { useEffect, useMemo } from 'react';
import type { OpenRouterWorkspaceProps } from './types';
import { buildOpenRouterModelOptions } from './openRouterViewHelpers';
import { useOpenRouterWorkspaceUiState } from './useOpenRouterWorkspaceUiState';

export function useOpenRouterWorkspaceRuntime({
  defaultModel,
  assignedModel,
  models,
}: OpenRouterWorkspaceProps) {
  const uiState = useOpenRouterWorkspaceUiState({
    defaultModel,
  });

  const modelSelectionLocked = Boolean(assignedModel);
  const modelOptions = useMemo(
    () => buildOpenRouterModelOptions(models, [defaultModel, assignedModel]),
    [assignedModel, defaultModel, models],
  );

  useEffect(() => {
    uiState.setSelectedModel(defaultModel);
  }, [defaultModel]);

  return {
    ...uiState,
    modelSelectionLocked,
    modelOptions,
  };
}
