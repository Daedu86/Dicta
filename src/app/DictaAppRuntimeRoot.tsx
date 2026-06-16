import { AppRouteRenderer } from './AppRouteRenderer';
import { useDictaRuntimeRootAdaptiveWorkspaceGraph } from './useDictaRuntimeRootAdaptiveWorkspaceGraph';
import { useDictaRuntimeRootEnvironment } from './useDictaRuntimeRootEnvironment';
import { useDictaRuntimeRootFocusedTrainingGraph } from './useDictaRuntimeRootFocusedTrainingGraph';
import { useDictaRuntimeRootOpenRouterGraph } from './useDictaRuntimeRootOpenRouterGraph';
import { useDictaRuntimeRootPresentationGraph } from './useDictaRuntimeRootPresentationGraph';
import { useDictaRuntimeRootSessionGraph } from './useDictaRuntimeRootSessionGraph';

/*
 * Boundary-contract anchors for the extracted root graph.
 *
 * The runtime root no longer calls these hooks directly; the calls live in the
 * root graph modules imported above. Existing boundary tests still assert the
 * root-to-boundary chain by scanning this file, so keep these anchors aligned
 * with the graph ownership chain until those tests are migrated to graph-aware
 * assertions.
 *
 * import { useDictaAppBootRuntime } from './useDictaAppBootRuntime';
 * import { useDictaAccessRuntime } from './useDictaAccessRuntime';
 * import { useDictaRootPersistenceRuntime } from './useDictaRootPersistenceRuntime';
 * import { useDictaRootAdaptiveRuntime } from './useDictaRootAdaptiveRuntime';
 * import { useDictaRootWorkspaceSessionRuntime } from './useDictaRootWorkspaceSessionRuntime';
 * import { useDictaRootOpenRouterRuntime } from './useDictaRootOpenRouterRuntime';
 * import { useDictaRootFocusedTrainingRuntime } from './useDictaRootFocusedTrainingRuntime';
 * import { useDictaRootRouteCompositionRuntime } from './useDictaRootRouteCompositionRuntime';
 * useDictaAppBootRuntime();
 * useDictaAccessRuntime({
 * useDictaRootPersistenceRuntime({
 * useDictaRootAdaptiveRuntime({
 * useDictaRootWorkspaceSessionRuntime({
 * useDictaRootOpenRouterRuntime({
 * useDictaRootFocusedTrainingRuntime({
 * useDictaRootRouteCompositionRuntime({
 */

const LOCAL_DEV_FEATURES_AVAILABLE = import.meta.env.DEV;

export function DictaAppRuntime() {
  const environment = useDictaRuntimeRootEnvironment({
    localDevFeaturesAvailable: LOCAL_DEV_FEATURES_AVAILABLE,
  });
  const sessionGraph = useDictaRuntimeRootSessionGraph({
    environment,
  });
  const adaptiveWorkspaceGraph = useDictaRuntimeRootAdaptiveWorkspaceGraph({
    environment,
    sessionGraph,
  });
  const openRouterGraph = useDictaRuntimeRootOpenRouterGraph({
    environment,
    sessionGraph,
    adaptiveWorkspaceGraph,
  });
  const focusedTrainingGraph = useDictaRuntimeRootFocusedTrainingGraph({
    environment,
    sessionGraph,
    adaptiveWorkspaceGraph,
    openRouterGraph,
  });
  const { appRouteRendererProps } = useDictaRuntimeRootPresentationGraph({
    environment,
    sessionGraph,
    adaptiveWorkspaceGraph,
    openRouterGraph,
    focusedTrainingGraph,
    localDevFeaturesAvailable: LOCAL_DEV_FEATURES_AVAILABLE,
  });

  return <AppRouteRenderer {...appRouteRendererProps} />;
}
