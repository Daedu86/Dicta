import type { useAdaptiveWorkspaceRouteRuntime } from './useAdaptiveWorkspaceRouteRuntime';
import type { useAppPresentationRuntime } from './useAppPresentationRuntime';

type AdaptiveWorkspaceRouteRuntimeArgs = Parameters<typeof useAdaptiveWorkspaceRouteRuntime>[0];
type AppPresentationRuntimeArgs = Parameters<typeof useAppPresentationRuntime>[0];

type FlatAdaptiveWorkspaceRouteRuntimeArgs = Exclude<
  AdaptiveWorkspaceRouteRuntimeArgs,
  { presentation: unknown }
>;

type FlatAppPresentationRuntimeArgs = Exclude<
  AppPresentationRuntimeArgs,
  { workspacePanels: unknown }
>;

type RouteDerivedLiveMetricsDockKey =
  | 'insightsDiagnosticInputOptions'
  | 'copyInsightsDiagnosticPackage'
  | 'selectInsightsDiagnosticFallbackReport';

export type DictaAppRouteCompositionRuntimeParams =
  FlatAdaptiveWorkspaceRouteRuntimeArgs &
  Omit<
    FlatAppPresentationRuntimeArgs,
    | RouteDerivedLiveMetricsDockKey
    | 'authRequired'
    | 'allowDictationScriptCreation'
  > & {
    currentPath: string;
    syncConfig: { authRequired: boolean };
    localDevFeaturesAvailable: boolean;
  };
