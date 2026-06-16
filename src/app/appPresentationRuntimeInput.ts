import type { useAppPresentationRuntime } from './useAppPresentationRuntime';
import type { DictaAppRouteCompositionRuntimeParams } from './dictaAppRouteCompositionTypes';

type AppPresentationRuntimeInput = Parameters<typeof useAppPresentationRuntime>[0];
type GroupedAppPresentationRuntimeInput = Extract<
  AppPresentationRuntimeInput,
  { workspacePanels: unknown }
>;
type WorkspacePanelsInput = GroupedAppPresentationRuntimeInput['workspacePanels'];
type LiveMetricsDockInput = GroupedAppPresentationRuntimeInput['liveMetricsDock'];

type RouteDerivedPresentationInput = Pick<
  WorkspacePanelsInput,
  | 'selectedBenchmarkProfile'
  | 'selectedSessionFeedback'
  | 'getBenchmarkActiveSessionStatus'
  | 'copySelectedBenchmarkJson'
  | 'downloadSelectedBenchmarkJson'
  | 'copyBenchmarkWithDictationScriptPrompt'
  | 'copyBenchmarkFeedbackPrompt'
  | 'copyBenchmarkFeedbackJson'
  | 'copySessionFeedbackJson'
  | 'copyDictationScriptPrompt'
  | 'copyDictationScriptTemplate'
  | 'copyBenchmarkFeedbackPromptWithHumanFeedback'
> &
  Pick<
    LiveMetricsDockInput,
    | 'insightsDiagnosticInputOptions'
    | 'copyInsightsDiagnosticPackage'
    | 'selectInsightsDiagnosticFallbackReport'
  >;

export function buildAppPresentationRuntimeInput(
  params: DictaAppRouteCompositionRuntimeParams,
  routeDerived: RouteDerivedPresentationInput,
): AppPresentationRuntimeInput {
  const source = { ...params, ...routeDerived };

  return {
    workspacePanels: source,
    appShellHeader: {
      ...source,
      authRequired: params.syncConfig.authRequired,
    },
    authWorkspace: source,
    sessionCreateCard: {
      ...source,
      allowDictationScriptCreation: params.isCurrentProfileAdmin || !params.syncConfig.authRequired,
    },
    liveMetricsDock: source,
  };
}
