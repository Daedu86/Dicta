import { useMemo } from 'react';
import type { OllamaWorkspaceProps } from '../components/ollama/types';
import {
  OLLAMA_RECOMMENDED_DEFAULT_MODEL,
  persistOllamaDefaultModel,
} from './modelPreferenceStorage';

type UseOllamaWorkspacePropsArgs = {
  defaultModel: string;
  getAuthHeaders: () => Record<string, string>;
  setOllamaDefaultModel: (value: string) => void;
  models: OllamaWorkspaceProps['models'];
  status: OllamaWorkspaceProps['status'];
  error: string;
  onRefreshModels: () => void | Promise<void>;
  onBackToTraining: () => void;
};

export function useOllamaWorkspaceProps({
  defaultModel,
  getAuthHeaders,
  setOllamaDefaultModel,
  models,
  status,
  error,
  onRefreshModels,
  onBackToTraining,
}: UseOllamaWorkspacePropsArgs): OllamaWorkspaceProps {
  return useMemo(() => ({
    defaultModel,
    authHeaders: getAuthHeaders(),
    models,
    status,
    error,
    onSetDefaultModel: (value: string) => {
      const nextModel = value.trim() || OLLAMA_RECOMMENDED_DEFAULT_MODEL;
      setOllamaDefaultModel(nextModel);
      persistOllamaDefaultModel(nextModel);
    },
    onRefreshModels,
    onBackToTraining,
  }), [
    defaultModel,
    getAuthHeaders,
    setOllamaDefaultModel,
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
  ]);
}
