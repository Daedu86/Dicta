import { useCallback } from 'react';

type RefreshOpenRouterModelCatalog = (options: {
  headers: Record<string, string>;
  assignedOpenRouterModel: string;
  openRouterDefaultModel: string;
  setOpenRouterDefaultModel: (model: string) => void;
}) => Promise<void>;

type UseModelRefreshActionsArgs = {
  getAuthHeaders: () => Record<string, string>;
  assignedOpenRouterModel: string;
  openRouterDefaultModel: string;
  setOpenRouterDefaultModel: (model: string) => void;
  refreshOpenRouterModelCatalog: RefreshOpenRouterModelCatalog;
};

export function useModelRefreshActions({
  getAuthHeaders,
  assignedOpenRouterModel,
  openRouterDefaultModel,
  setOpenRouterDefaultModel,
  refreshOpenRouterModelCatalog,
}: UseModelRefreshActionsArgs) {
  const refreshOpenRouterModels = useCallback(async (): Promise<void> => {
    await refreshOpenRouterModelCatalog({
      headers: getAuthHeaders(),
      assignedOpenRouterModel,
      openRouterDefaultModel,
      setOpenRouterDefaultModel,
    });
  }, [
    assignedOpenRouterModel,
    getAuthHeaders,
    openRouterDefaultModel,
    refreshOpenRouterModelCatalog,
    setOpenRouterDefaultModel,
  ]);

  return {
    refreshOpenRouterModels,
  };
}
