import { useAdaptiveWorkspaceRouteRuntime } from './useAdaptiveWorkspaceRouteRuntime';
import { useAppPresentationRuntime } from './useAppPresentationRuntime';
import { buildAdaptiveWorkspaceRouteRuntimeInput } from './adaptiveWorkspaceRouteRuntimeInput';
import { buildAppPresentationRuntimeInput } from './appPresentationRuntimeInput';
import type { DictaAppRouteCompositionRuntimeParams } from './dictaAppRouteCompositionTypes';

export function useDictaAppRouteCompositionRuntime(params: DictaAppRouteCompositionRuntimeParams) {
  const { currentPath } = params;

  const {
    insightsDiagnosticInputOptions,
    copyInsightsDiagnosticPackage,
    selectInsightsDiagnosticFallbackReport,
  } = useAdaptiveWorkspaceRouteRuntime(buildAdaptiveWorkspaceRouteRuntimeInput(params));
  const isFocusedTrainingRoute = currentPath === '/training' || currentPath === '/training/';

  const {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  } = useAppPresentationRuntime(
    buildAppPresentationRuntimeInput(params, {
      insightsDiagnosticInputOptions,
      copyInsightsDiagnosticPackage,
      selectInsightsDiagnosticFallbackReport,
    }),
  );

  return {
    isFocusedTrainingRoute,
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  };
}
