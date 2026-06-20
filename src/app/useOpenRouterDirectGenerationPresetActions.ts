import { useCallback } from 'react';
import {
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from './openRouterDirectGenerationPresets';

const MAX_TOPIC_CONTEXT_LENGTH = 180;

type OpenRouterDirectGenerationBusyControls = {
  adaptiveOpenRouterBusy: boolean;
  setAdaptiveOpenRouterBusy: (value: boolean) => void;
  topicOpenRouterBusy: boolean;
  setTopicOpenRouterBusy: (value: boolean) => void;
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
  adaptiveOpenRouterBusy,
  setAdaptiveOpenRouterBusy,
  topicOpenRouterBusy,
  setTopicOpenRouterBusy,
}: UseOpenRouterDirectGenerationPresetActionsOptions) {
  const generateAdaptiveNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive,
      isBusy: adaptiveOpenRouterBusy,
      setBusy: setAdaptiveOpenRouterBusy,
    });
  }, [adaptiveOpenRouterBusy, generateDirectSessionFromOpenRouter, setAdaptiveOpenRouterBusy]);

  const generateTopicNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    const topicContext = readTopicContextFromPrompt();
    if (!topicContext) return;

    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.topic,
      isBusy: topicOpenRouterBusy,
      setBusy: setTopicOpenRouterBusy,
      topicContext,
    });
  }, [generateDirectSessionFromOpenRouter, setTopicOpenRouterBusy, topicOpenRouterBusy]);

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
