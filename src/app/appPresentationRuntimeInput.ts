import type { useAppPresentationRuntime } from './useAppPresentationRuntime';
import type { DictaAppRouteCompositionRuntimeParams } from './useDictaAppRouteCompositionRuntime';

type AppPresentationRuntimeInput = Parameters<typeof useAppPresentationRuntime>[0];
type WorkspacePanelsInput = AppPresentationRuntimeInput['workspacePanels'];
type LiveMetricsDockInput = AppPresentationRuntimeInput['liveMetricsDock'];

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
