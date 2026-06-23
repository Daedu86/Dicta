import { useCallback } from 'react';
import {
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from './openRouterDirectGenerationPresets';
import type { OpenRouterDirectGenerationActionOptions } from './openRouterDirectGenerationRunnerTypes';
import { normalizeOpenRouterDirectGenerationTopicContext } from './openRouterDirectGenerationTopicContext';

type OpenRouterDirectGenerationBusyControls = {
  adaptiveOpenRouterBusy: boolean;
  setAdaptiveOpenRouterBusy: (value: boolean) => void;
  topicOpenRouterBusy: boolean;
  setTopicOpenRouterBusy: (value: boolean) => void;
};

type GenerateOpenRouterDirectSession = (
  options: OpenRouterDirectGenerationPreset & OpenRouterDirectGenerationActionOptions & {
    isBusy: boolean;
    setBusy: (value: boolean) => void;
  },
) => Promise<void>;

type UseOpenRouterDirectGenerationPresetActionsOptions = OpenRouterDirectGenerationBusyControls & {
  generateDirectSessionFromOpenRouter: GenerateOpenRouterDirectSession;
  directGenerationDurationMinutes: OpenRouterDirectGenerationPreset['durationMinutes'];
};

export function useOpenRouterDirectGenerationPresetActions({
  generateDirectSessionFromOpenRouter,
  directGenerationDurationMinutes,
  adaptiveOpenRouterBusy,
  setAdaptiveOpenRouterBusy,
  topicOpenRouterBusy,
  setTopicOpenRouterBusy,
}: UseOpenRouterDirectGenerationPresetActionsOptions) {
  const generateAdaptiveNextSessionFromOpenRouter = useCallback(async (
    options: OpenRouterDirectGenerationActionOptions = {},
  ): Promise<void> => {
    const durationMinutes = options.durationMinutes ?? directGenerationDurationMinutes;
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive,
      ...options,
      durationMinutes,
      isBusy: adaptiveOpenRouterBusy,
      setBusy: setAdaptiveOpenRouterBusy,
    });
  }, [adaptiveOpenRouterBusy, directGenerationDurationMinutes, generateDirectSessionFromOpenRouter, setAdaptiveOpenRouterBusy]);

  const generateTopicNextSessionFromOpenRouter = useCallback(async (
    options: OpenRouterDirectGenerationActionOptions = {},
  ): Promise<void> => {
    const topicContext = normalizeTopicContext(options.topicContext ?? readTopicContextFromPrompt());
    if (!topicContext) return;
    const durationMinutes = options.durationMinutes ?? directGenerationDurationMinutes;

    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.topic,
      ...options,
      durationMinutes,
      isBusy: topicOpenRouterBusy,
      setBusy: setTopicOpenRouterBusy,
      topicContext,
    });
  }, [directGenerationDurationMinutes, generateDirectSessionFromOpenRouter, setTopicOpenRouterBusy, topicOpenRouterBusy]);

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

const normalizeTopicContext = normalizeOpenRouterDirectGenerationTopicContext;
