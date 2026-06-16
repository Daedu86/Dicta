import { AppRouteRenderer } from './AppRouteRenderer';
import { useDictaRuntimeRootAdaptiveWorkspaceGraph } from './useDictaRuntimeRootAdaptiveWorkspaceGraph';
import { useDictaRuntimeRootEnvironment } from './useDictaRuntimeRootEnvironment';
import { useDictaRuntimeRootFocusedTrainingGraph } from './useDictaRuntimeRootFocusedTrainingGraph';
import { useDictaRuntimeRootOpenRouterGraph } from './useDictaRuntimeRootOpenRouterGraph';
import { useDictaRuntimeRootPresentationGraph } from './useDictaRuntimeRootPresentationGraph';
import { useDictaRuntimeRootSessionGraph } from './useDictaRuntimeRootSessionGraph';

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
