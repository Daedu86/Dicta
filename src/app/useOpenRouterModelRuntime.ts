import { useModelCatalogRuntime } from './useModelCatalogRuntime';
import { useModelPreferenceRuntime } from './useModelPreferenceRuntime';
import { useWorkspaceModelRefreshRuntime } from './useWorkspaceModelRefreshRuntime';

type UseOpenRouterModelRuntimeOptions = Omit<
  Parameters<typeof useWorkspaceModelRefreshRuntime>[0],
  'openRouterDefaultModel' | 'setOpenRouterDefaultModel' | 'refreshOpenRouterModelCatalog'
>;

export function useOpenRouterModelRuntime(options: UseOpenRouterModelRuntimeOptions) {
  const {
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
  } = useModelPreferenceRuntime();

  const {
    openRouterModels,
    openRouterStatus,
    openRouterError,
    setOpenRouterError,
    refreshOpenRouterModels: refreshOpenRouterModelCatalog,
  } = useModelCatalogRuntime();

  const {
    assignedOpenRouterModel,
    effectiveOpenRouterDefaultModel,
    refreshOpenRouterModels,
  } = useWorkspaceModelRefreshRuntime({
    ...options,
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
    refreshOpenRouterModelCatalog,
  });

  return {
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
    openRouterModels,
    openRouterStatus,
    openRouterError,
    setOpenRouterError,
    assignedOpenRouterModel,
    effectiveOpenRouterDefaultModel,
    refreshOpenRouterModels,
  };
}
