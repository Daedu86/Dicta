import { useCallback } from 'react';
import {
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from './openRouterDirectGenerationPresets';

type OpenRouterDirectGenerationBusyControls = {
  directOpenRouterBusy: boolean;
  setDirectOpenRouterBusy: (value: boolean) => void;
};

type GenerateOpenRouterDirectSession = (
  options: OpenRouterDirectGenerationPreset & {
    isBusy: boolean;
    setBusy: (value: boolean) => void;
  },
) => Promise<void>;

type UseOpenRouterDirectGenerationPresetActionsOptions = OpenRouterDirectGenerationBusyControls & {
  generateDirectSessionFromOpenRouter: GenerateOpenRouterDirectSession;
};

export function useOpenRouterDirectGenerationPresetActions({
  generateDirectSessionFromOpenRouter,
  directOpenRouterBusy,
  setDirectOpenRouterBusy,
}: UseOpenRouterDirectGenerationPresetActionsOptions) {
  const generateAdaptiveNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive,
      isBusy: directOpenRouterBusy,
      setBusy: setDirectOpenRouterBusy,
    });
  }, [directOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectOpenRouterBusy]);

  return {
    generateAdaptiveNextSessionFromOpenRouter,
  };
}
