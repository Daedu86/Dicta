import { useCallback, useState } from 'react';
import type { OllamaModelSummary } from '../components/ollama/types';
import type { OpenRouterModelSummary } from '../components/openrouter/types';
import {
  OLLAMA_RECOMMENDED_DEFAULT_MODEL,
  persistOllamaDefaultModel,
  persistOpenRouterDefaultModel,
} from './modelPreferenceStorage';

type ModelCatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

type RefreshOpenRouterModelsOptions = {
  headers: Record<string, string>;
  assignedOpenRouterModel: string;
  openRouterDefaultModel: string;
  setOpenRouterDefaultModel: (value: string) => void;
};

type RefreshOllamaModelsOptions = {
  headers: Record<string, string>;
  ollamaDefaultModel: string;
  setOllamaDefaultModel: (value: string) => void;
};

export function useModelCatalogRuntime() {
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelSummary[]>([]);
  const [openRouterStatus, setOpenRouterStatus] = useState<ModelCatalogStatus>('idle');
  const [openRouterError, setOpenRouterError] = useState('');
  const [ollamaModels, setOllamaModels] = useState<OllamaModelSummary[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<ModelCatalogStatus>('idle');
  const [ollamaError, setOllamaError] = useState('');

  const refreshOpenRouterModels = useCallback(async ({
    headers,
    assignedOpenRouterModel,
    openRouterDefaultModel,
    setOpenRouterDefaultModel,
  }: RefreshOpenRouterModelsOptions): Promise<void> => {
    setOpenRouterStatus('loading');
    setOpenRouterError('');
    try {
      const response = await fetch('/api/openrouter/models', { headers });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `OpenRouter request failed (${response.status}).`);
      }
      const payload = (await response.json()) as {
        data?: Array<{
          id: string;
          name?: string;
          context_length?: number;
          pricing?: { prompt?: string | number; completion?: string | number };
        }>;
      };
      const data = Array.isArray(payload.data) ? payload.data : [];
      const freeModels = data
        .filter((model) => {
          const prompt = Number(model.pricing?.prompt ?? NaN);
          const completion = Number(model.pricing?.completion ?? NaN);
          return Number.isFinite(prompt) && Number.isFinite(completion) && prompt === 0 && completion === 0;
        })
        .map((model) => ({ id: model.id, name: model.name, context_length: model.context_length }))
        .sort((a, b) => a.id.localeCompare(b.id));
      setOpenRouterModels(freeModels);
      setOpenRouterStatus('ready');
      if (!assignedOpenRouterModel && !openRouterDefaultModel && freeModels.length > 0) {
        setOpenRouterDefaultModel(freeModels[0].id);
        persistOpenRouterDefaultModel(freeModels[0].id);
      }
    } catch (err) {
      setOpenRouterModels([]);
      setOpenRouterStatus('error');
      setOpenRouterError(err instanceof Error ? err.message : 'OpenRouter model fetch failed.');
    }
  }, []);

  const refreshOllamaModels = useCallback(async ({
    headers,
    ollamaDefaultModel,
    setOllamaDefaultModel,
  }: RefreshOllamaModelsOptions): Promise<void> => {
    setOllamaStatus('loading');
    setOllamaError('');
    try {
      const response = await fetch('/api/ollama/models', { headers });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Ollama request failed (${response.status}).`);
      }
      const payload = (await response.json()) as {
        data?: Array<{
          id: string;
          name?: string;
          modified_at?: string;
          size?: number;
          details?: OllamaModelSummary['details'];
        }>;
      };
      const data = Array.isArray(payload.data) ? payload.data : [];
      const nextModels = data
        .filter((model) => typeof model.id === 'string' && model.id.trim())
        .map((model) => ({
          id: model.id,
          name: model.name,
          modified_at: model.modified_at,
          size: model.size,
          details: model.details,
        }))
        .sort((a, b) => {
          if (a.id === OLLAMA_RECOMMENDED_DEFAULT_MODEL) return -1;
          if (b.id === OLLAMA_RECOMMENDED_DEFAULT_MODEL) return 1;
          return a.id.localeCompare(b.id);
        });
      setOllamaModels(nextModels);
      setOllamaStatus('ready');
      if (!ollamaDefaultModel.trim()) {
        const nextDefault = nextModels[0]?.id ?? OLLAMA_RECOMMENDED_DEFAULT_MODEL;
        setOllamaDefaultModel(nextDefault);
        persistOllamaDefaultModel(nextDefault);
      }
    } catch (err) {
      setOllamaModels([]);
      setOllamaStatus('error');
      setOllamaError(err instanceof Error ? err.message : 'Ollama model fetch failed.');
    }
  }, []);

  return {
    openRouterModels,
    openRouterStatus,
    openRouterError,
    setOpenRouterError,
    ollamaModels,
    ollamaStatus,
    ollamaError,
    refreshOpenRouterModels,
    refreshOllamaModels,
  };
}
