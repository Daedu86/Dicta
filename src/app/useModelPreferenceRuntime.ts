import { useState } from 'react';
import { loadOpenRouterDefaultModel } from './modelPreferenceStorage';

export function useModelPreferenceRuntime() {
  const [openRouterDefaultModel, setOpenRouterDefaultModel] = useState(() => loadOpenRouterDefaultModel());

  return {
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
  };
}
