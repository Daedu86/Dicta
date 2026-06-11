import { useState } from 'react';
import {
  loadOllamaDefaultModel,
  loadOpenRouterDefaultModel,
} from './modelPreferenceStorage';

export function useModelPreferenceRuntime() {
  const [openRouterDefaultModel, setOpenRouterDefaultModel] = useState(() => loadOpenRouterDefaultModel());
  const [ollamaDefaultModel, setOllamaDefaultModel] = useState(() => loadOllamaDefaultModel());

  return {
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
    ollamaDefaultModel,
    setOllamaDefaultModel,
  };
}
