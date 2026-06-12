import { useCallback, useState } from 'react';
import type { OpenRouterModelSummary } from '../components/openrouter/types';
import { persistOpenRouterDefaultModel } from './modelPreferenceStorage';

type ModelCatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

type RefreshOpenRouterModelsOptions = {
  headers: Record<string, string>;
  assignedOpenRouterModel: string;
  openRouterDefaultModel: string;
  setOpenRouterDefaultModel: (value: string) => void;
};

export function useModelCatalogRuntime() {
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelSummary[]>([]);
  const [openRouterStatus, setOpenRouterStatus] = useState<ModelCatalogStatus>('idle');
  const [openRouterError, setOpenRouterError] = useState('');

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

  return {
    openRouterModels,
    openRouterStatus,
    openRouterError,
    setOpenRouterError,
    refreshOpenRouterModels,
  };
}
