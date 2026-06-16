import { useDictaAppRouteCompositionRuntime } from './useDictaAppRouteCompositionRuntime';

type DictaRootRouteCompositionRuntimeParams = Parameters<
  typeof useDictaAppRouteCompositionRuntime
>[0];

export function useDictaRootRouteCompositionRuntime(
  params: DictaRootRouteCompositionRuntimeParams,
) {
  return useDictaAppRouteCompositionRuntime(params);
}
