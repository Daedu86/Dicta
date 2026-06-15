import { OpenRouterModelSelector } from './OpenRouterModelSelector';
import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';

type OpenRouterModelsWorkspaceProps = Pick<
  OpenRouterWorkspaceProps,
  'defaultModel' | 'assignedModel' | 'models' | 'status' | 'error' | 'onSetDefaultModel' | 'onRefreshModels'
>;

type OpenRouterModelsRuntime = Pick<OpenRouterWorkspaceRuntime, 'selectedModel' | 'setSelectedModel' | 'modelOptions' | 'modelSelectionLocked'>;

export type OpenRouterModelsSectionProps = {
  workspace: OpenRouterModelsWorkspaceProps;
  runtime: OpenRouterModelsRuntime;
};

export function OpenRouterModelsSection({ workspace, runtime }: OpenRouterModelsSectionProps) {
  const { defaultModel, assignedModel, models, status, error, onSetDefaultModel, onRefreshModels } = workspace;
  const { selectedModel, setSelectedModel, modelOptions, modelSelectionLocked } = runtime;

  return (
    <OpenRouterModelSelector
      defaultModel={defaultModel}
      assignedModel={assignedModel}
      selectedModel={selectedModel}
      modelOptions={modelOptions}
      freeModelCount={models.length}
      modelSelectionLocked={modelSelectionLocked}
      status={status}
      error={error}
      onSelectModel={setSelectedModel}
      onSetDefaultModel={onSetDefaultModel}
      onRefreshModels={onRefreshModels}
    />
  );
}
