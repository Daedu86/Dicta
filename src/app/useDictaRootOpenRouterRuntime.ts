import type { MutableRefObject } from 'react';
import { mapSessionInputMode } from './appRuntimeHelpers';
import { useDictaOpenRouterRuntime } from './useDictaOpenRouterRuntime';

type DictaOpenRouterRuntimeOptions = Parameters<typeof useDictaOpenRouterRuntime>[0];
type OpenRouterGenerationOptions = DictaOpenRouterRuntimeOptions['generation'];
type OpenRouterSessionContextOptions = OpenRouterGenerationOptions['sessionContext'];

export type UseDictaRootOpenRouterRuntimeOptions = Omit<
  DictaOpenRouterRuntimeOptions,
  'generation' | 'resetOpenRouterJobsRuntimeRef'
> & {
  access: OpenRouterGenerationOptions['access'];
  sessionContext: Omit<OpenRouterSessionContextOptions, 'fallbackInputMode'> & {
    activeInputMode: Parameters<typeof mapSessionInputMode>[0];
  };
  generation: OpenRouterGenerationOptions['generation'];
  adaptiveContext: OpenRouterGenerationOptions['adaptiveContext'];
  presentationActions: OpenRouterGenerationOptions['presentationActions'];
  resetOpenRouterJobsRuntimeRef: MutableRefObject<() => void>;
};

export function useDictaRootOpenRouterRuntime({
  errorSessionActions,
  generatedScriptSettlement,
  jobs,
  access,
  sessionContext,
  generation,
  adaptiveContext,
  presentationActions,
  resetOpenRouterJobsRuntimeRef,
}: UseDictaRootOpenRouterRuntimeOptions) {
  const { activeInputMode, ...sessionContextWithoutActiveInputMode } = sessionContext;

  return useDictaOpenRouterRuntime({
    errorSessionActions,
    generatedScriptSettlement,
    jobs,
    generation: {
      access,
      sessionContext: {
        ...sessionContextWithoutActiveInputMode,
        fallbackInputMode: mapSessionInputMode(activeInputMode),
      },
      generation,
      adaptiveContext,
      presentationActions,
    },
    resetOpenRouterJobsRuntimeRef,
  });
}
