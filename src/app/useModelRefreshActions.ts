import { useCallback } from 'react';

type RefreshOpenRouterModelCatalog = (options: {
  headers: Record<string, string>;
  assignedOpenRouterModel: string;
  openRouterDefaultModel: string;
  setOpenRouterDefaultModel: (model: string) => void;
}) => Promise<void>;

type RefreshOllamaModelCatalog = (options: {
  headers: Record<string, string>;
  ollamaDefaultModel: string;
  setOllamaDefaultModel: (model: string) => void;
}) => Promise<void>;

type UseModelRefreshActionsArgs = {
  getAuthHeaders: () => Record<string, string>;
  assignedOpenRouterModel: string;
  openRouterDefaultModel: string;
  setOpenRouterDefaultModel: (model: string) => void;
  ollamaDefaultModel: string;
  setOllamaDefaultModel: (model: string) => void;
  refreshOpenRouterModelCatalog: RefreshOpenRouterModelCatalog;
  refreshOllamaModelCatalog: RefreshOllamaModelCatalog;
};

export function useModelRefreshActions({
  getAuthHeaders,
  assignedOpenRouterModel,
  openRouterDefaultModel,
  setOpenRouterDefaultModel,
  ollamaDefaultModel,
  setOllamaDefaultModel,
  refreshOpenRouterModelCatalog,
  refreshOllamaModelCatalog,
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

  const refreshOllamaModels = useCallback(async (): Promise<void> => {
    await refreshOllamaModelCatalog({
      headers: getAuthHeaders(),
      ollamaDefaultModel,
      setOllamaDefaultModel,
    });
  }, [
    getAuthHeaders,
    ollamaDefaultModel,
    refreshOllamaModelCatalog,
    setOllamaDefaultModel,
  ]);

  return {
    refreshOpenRouterModels,
    refreshOllamaModels,
  };
}
