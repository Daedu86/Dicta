import type { useDictaLocalStorageImportRuntime } from './useDictaLocalStorageImportRuntime';
import type { useDictaRootRouteCompositionRuntime } from './useDictaRootRouteCompositionRuntime';
import type { DictaRuntimeRootAdaptiveWorkspaceGraph } from './useDictaRuntimeRootAdaptiveWorkspaceGraph';
import type { DictaRuntimeRootEnvironment } from './useDictaRuntimeRootEnvironment';
import type { DictaRuntimeRootFocusedTrainingGraph } from './useDictaRuntimeRootFocusedTrainingGraph';
import type { DictaRuntimeRootOpenRouterGraph } from './useDictaRuntimeRootOpenRouterGraph';
import type { DictaRuntimeRootSessionGraph } from './useDictaRuntimeRootSessionGraph';

type DictaRootRouteCompositionRuntimeInput = Parameters<typeof useDictaRootRouteCompositionRuntime>[0];
type LocalStorageImportSnapshotHandler = ReturnType<
  typeof useDictaLocalStorageImportRuntime
>['importDictaLocalStorageSnapshot'];

type DictaRuntimeRootRouteCompositionInputOptions = {
  environment: DictaRuntimeRootEnvironment;
  sessionGraph: DictaRuntimeRootSessionGraph;
  adaptiveWorkspaceGraph: DictaRuntimeRootAdaptiveWorkspaceGraph;
  openRouterGraph: DictaRuntimeRootOpenRouterGraph;
  focusedTrainingGraph: DictaRuntimeRootFocusedTrainingGraph;
  localDevFeaturesAvailable: boolean;
  importDictaLocalStorageSnapshot: LocalStorageImportSnapshotHandler;
};

export function buildDictaRuntimeRootRouteCompositionInput({
  environment,
  sessionGraph,
  adaptiveWorkspaceGraph,
  openRouterGraph,
  focusedTrainingGraph,
  localDevFeaturesAvailable,
  importDictaLocalStorageSnapshot,
}: DictaRuntimeRootRouteCompositionInputOptions): DictaRootRouteCompositionRuntimeInput {
  const {
    perfDiagnosticsEnabled,
    sessionsState,
    trainingState,
    routing,
    theme,
    accessRuntime,
    uiPreferences,
    adaptiveWorkspaceState,
  } = environment;
  const { persistenceRuntime, sessionCreationRuntime, ttsSessionRuntime } = sessionGraph;
  const { adaptiveRuntime, workspaceSessionRuntime } = adaptiveWorkspaceGraph;

  return {
    ...adaptiveWorkspaceState,
    ...adaptiveRuntime,
    ...workspaceSessionRuntime,
    ...trainingState,
    ...routing,
    ...theme,
    ...accessRuntime,
    ...uiPreferences,
    ...persistenceRuntime,
    ...sessionCreationRuntime,
    ...ttsSessionRuntime,
    ...openRouterGraph,
    ...focusedTrainingGraph,
    sessions: sessionsState.sessions,
    selectedBenchmarkInputMode: openRouterGraph.selectedBenchmarkInputMode,
    selectedBenchmarkLanguage: openRouterGraph.selectedBenchmarkLanguage,
    importDictaLocalStorageSnapshot,
    localDevFeaturesAvailable,
    perfDiagnosticsEnabled,
  };
}
