import { useCallback } from 'react';
import {
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from './openRouterDirectGenerationPresets';

const MAX_TOPIC_CONTEXT_LENGTH = 180;

type OpenRouterDirectGenerationBusyControls = {
  directOpenRouterBusy: boolean;
  setDirectOpenRouterBusy: (value: boolean) => void;
};

type GenerateOpenRouterDirectSession = (
  options: OpenRouterDirectGenerationPreset & {
    isBusy: boolean;
    setBusy: (value: boolean) => void;
    topicContext?: string;
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

  const generateTopicNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    const topicContext = readTopicContextFromPrompt();
    if (!topicContext) return;

    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive,
      isBusy: directOpenRouterBusy,
      setBusy: setDirectOpenRouterBusy,
      topicContext,
    });
  }, [directOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectOpenRouterBusy]);

  return {
    generateAdaptiveNextSessionFromOpenRouter,
    generateTopicNextSessionFromOpenRouter,
  };
}

function readTopicContextFromPrompt(): string {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return '';
  const value = window.prompt('What topic should this session use? Example: cats, clouds, plants, Berlin.');
  return normalizeTopicContext(value);
}

function normalizeTopicContext(value: string | null): string {
  const trimmed = value?.trim().replace(/\s+/g, ' ') ?? '';
  return trimmed.slice(0, MAX_TOPIC_CONTEXT_LENGTH);
}
