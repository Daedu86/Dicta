import { useAdaptiveWorkspaceRouteRuntime } from './useAdaptiveWorkspaceRouteRuntime';
import { useAppPresentationRuntime } from './useAppPresentationRuntime';
import { buildAdaptiveWorkspaceRouteRuntimeInput } from './adaptiveWorkspaceRouteRuntimeInput';
import { buildAppPresentationRuntimeInput } from './appPresentationRuntimeInput';

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

type RouteDerivedWorkspacePanelKey =
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
  | 'copyBenchmarkFeedbackPromptWithHumanFeedback';

type RouteDerivedLiveMetricsDockKey =
  | 'insightsDiagnosticInputOptions'
  | 'copyInsightsDiagnosticPackage'
  | 'selectInsightsDiagnosticFallbackReport';

export type DictaAppRouteCompositionRuntimeParams =
  Omit<FlatAdaptiveWorkspaceRouteRuntimeArgs, 'mapSessionInputMode'> &
  Omit<
    FlatAppPresentationRuntimeArgs,
    | RouteDerivedWorkspacePanelKey
    | RouteDerivedLiveMetricsDockKey
    | 'authRequired'
    | 'allowDictationScriptCreation'
  > & {
    currentPath: string;
    openAdaptiveExportsForActiveInput: unknown;
    syncConfig: { authRequired: boolean };
    localDevFeaturesAvailable: boolean;
  };

export function useDictaAppRouteCompositionRuntime(params: DictaAppRouteCompositionRuntimeParams) {
  const { currentPath, openAdaptiveExportsForActiveInput } = params;

  const {
    selectedBenchmarkProfile,
    insightsDiagnosticInputOptions,
    copyInsightsDiagnosticPackage,
    selectInsightsDiagnosticFallbackReport,
    selectedSessionFeedback,
    getBenchmarkActiveSessionStatus,
    copySelectedBenchmarkJson,
    downloadSelectedBenchmarkJson,
    copyDictationScriptPrompt,
    copyBenchmarkWithDictationScriptPrompt,
    copyDictationScriptTemplate,
    copySessionFeedbackJson,
    copyBenchmarkFeedbackJson,
    copyBenchmarkFeedbackPrompt,
    copyBenchmarkFeedbackPromptWithHumanFeedback,
    adaptiveAdvancedDiagnosticsProps,
    adaptiveBenchmarkSectionProps,
  } = useAdaptiveWorkspaceRouteRuntime(buildAdaptiveWorkspaceRouteRuntimeInput(params));
  const isFocusedTrainingRoute = currentPath === '/training' || currentPath === '/training/';

  void openAdaptiveExportsForActiveInput;

  const {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    leaderboardWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  } = useAppPresentationRuntime(
    buildAppPresentationRuntimeInput(params, {
      selectedBenchmarkProfile,
      selectedSessionFeedback,
      getBenchmarkActiveSessionStatus,
      copySelectedBenchmarkJson,
      downloadSelectedBenchmarkJson,
      copyBenchmarkWithDictationScriptPrompt,
      copyBenchmarkFeedbackPrompt,
      copyBenchmarkFeedbackJson,
      copySessionFeedbackJson,
      copyDictationScriptPrompt,
      copyDictationScriptTemplate,
      copyBenchmarkFeedbackPromptWithHumanFeedback,
      insightsDiagnosticInputOptions,
      copyInsightsDiagnosticPackage,
      selectInsightsDiagnosticFallbackReport,
    }),
  );

  return {
    adaptiveAdvancedDiagnosticsProps,
    adaptiveBenchmarkSectionProps,
    isFocusedTrainingRoute,
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    leaderboardWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  };
}
