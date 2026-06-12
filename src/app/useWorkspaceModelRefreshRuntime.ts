import type { DictaAppProfile } from '../core/appProfiles';
import { useModelRefreshActions } from './useModelRefreshActions';

type ModelRefreshActionsArgs = Parameters<typeof useModelRefreshActions>[0];

type WorkspaceModelProfile = Pick<DictaAppProfile, 'role' | 'assignedOpenRouterModel'>;

interface WorkspaceModelSyncConfig {
  authRequired: boolean;
}

interface ResolveEffectiveOpenRouterDefaultModelArgs {
  syncConfig: WorkspaceModelSyncConfig;
  appProfile: WorkspaceModelProfile | null | undefined;
  openRouterDefaultModel: string;
}

interface UseWorkspaceModelRefreshRuntimeArgs extends Omit<ModelRefreshActionsArgs, 'assignedOpenRouterModel'> {
  syncConfig: WorkspaceModelSyncConfig;
  appProfile: WorkspaceModelProfile | null | undefined;
}

export function resolveEffectiveOpenRouterDefaultModel({
  syncConfig,
  appProfile,
  openRouterDefaultModel,
}: ResolveEffectiveOpenRouterDefaultModelArgs): {
  assignedOpenRouterModel: string;
  effectiveOpenRouterDefaultModel: string;
} {
  const assignedOpenRouterModel =
    syncConfig.authRequired && appProfile?.role === 'member'
      ? appProfile.assignedOpenRouterModel?.trim() ?? ''
      : '';

  return {
    assignedOpenRouterModel,
    effectiveOpenRouterDefaultModel: assignedOpenRouterModel || openRouterDefaultModel,
  };
}

export function useWorkspaceModelRefreshRuntime({
  syncConfig,
  appProfile,
  getAuthHeaders,
  openRouterDefaultModel,
  setOpenRouterDefaultModel,
  ollamaDefaultModel,
  setOllamaDefaultModel,
  refreshOpenRouterModelCatalog,
  refreshOllamaModelCatalog,
}: UseWorkspaceModelRefreshRuntimeArgs): {
  assignedOpenRouterModel: string;
  effectiveOpenRouterDefaultModel: string;
  refreshOpenRouterModels: ReturnType<typeof useModelRefreshActions>['refreshOpenRouterModels'];
  refreshOllamaModels: ReturnType<typeof useModelRefreshActions>['refreshOllamaModels'];
} {
  const {
    assignedOpenRouterModel,
    effectiveOpenRouterDefaultModel,
  } = resolveEffectiveOpenRouterDefaultModel({
    syncConfig,
    appProfile,
    openRouterDefaultModel,
  });

  const {
    refreshOpenRouterModels,
    refreshOllamaModels,
  } = useModelRefreshActions({
    getAuthHeaders,
    assignedOpenRouterModel,
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
    ollamaDefaultModel,
    setOllamaDefaultModel,
    refreshOpenRouterModelCatalog,
    refreshOllamaModelCatalog,
  });

  return {
    assignedOpenRouterModel,
    effectiveOpenRouterDefaultModel,
    refreshOpenRouterModels,
    refreshOllamaModels,
  };
}
