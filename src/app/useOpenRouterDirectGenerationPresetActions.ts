import { useCallback } from 'react';
import {
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from './openRouterDirectGenerationPresets';

type OpenRouterDirectGenerationBusyControls = {
  directOpenRouterBusy: boolean;
  setDirectOpenRouterBusy: (value: boolean) => void;
  directIntermediateOpenRouterBusy: boolean;
  setDirectIntermediateOpenRouterBusy: (value: boolean) => void;
  directAdvancedOpenRouterBusy: boolean;
  setDirectAdvancedOpenRouterBusy: (value: boolean) => void;
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
  directIntermediateOpenRouterBusy,
  setDirectIntermediateOpenRouterBusy,
  directAdvancedOpenRouterBusy,
  setDirectAdvancedOpenRouterBusy,
}: UseOpenRouterDirectGenerationPresetActionsOptions) {
  const generateEasyNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.easy,
      isBusy: directOpenRouterBusy,
      setBusy: setDirectOpenRouterBusy,
    });
  }, [directOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectOpenRouterBusy]);

  const generateIntermediateNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium,
      isBusy: directIntermediateOpenRouterBusy,
      setBusy: setDirectIntermediateOpenRouterBusy,
    });
  }, [directIntermediateOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectIntermediateOpenRouterBusy]);

  const generateAdvancedNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.hard,
      isBusy: directAdvancedOpenRouterBusy,
      setBusy: setDirectAdvancedOpenRouterBusy,
    });
  }, [directAdvancedOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectAdvancedOpenRouterBusy]);

  return {
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
  };
}
