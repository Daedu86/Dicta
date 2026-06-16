import { useAdaptiveWorkspaceRouteRuntime } from './useAdaptiveWorkspaceRouteRuntime';
import { useAppPresentationRuntime } from './useAppPresentationRuntime';
import { buildAdaptiveWorkspaceRouteRuntimeInput } from './adaptiveWorkspaceRouteRuntimeInput';
import { buildAppPresentationRuntimeInput } from './appPresentationRuntimeInput';
import type { DictaAppRouteCompositionRuntimeParams } from './dictaAppRouteCompositionTypes';

export function useDictaAppRouteCompositionRuntime(params: DictaAppRouteCompositionRuntimeParams) {
  const { currentPath } = params;

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
