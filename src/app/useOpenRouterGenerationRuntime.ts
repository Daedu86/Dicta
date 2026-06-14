import { useOpenRouterGenerationBusyState } from './useOpenRouterGenerationBusyState';
import {
  useOpenRouterGenerationActions,
  type OpenRouterGenerationBusyControls,
  type UseOpenRouterGenerationActionsOptions,
} from './useOpenRouterGenerationActions';

type UseOpenRouterGenerationRuntimeOptions = Omit<
  UseOpenRouterGenerationActionsOptions,
  keyof OpenRouterGenerationBusyControls
>;

export function useOpenRouterGenerationRuntime(options: UseOpenRouterGenerationRuntimeOptions) {
  const busyState = useOpenRouterGenerationBusyState();
  const generationActions = useOpenRouterGenerationActions({
    ...options,
    ...busyState,
  });

  return {
    ...busyState,
    ...generationActions,
  };
}
