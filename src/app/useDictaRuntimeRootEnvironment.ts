import { useAdaptiveWorkspaceState } from './useAdaptiveWorkspaceState';
import { useDictaAccessRuntime } from './useDictaAccessRuntime';
import { useDictaAppBootRuntime } from './useDictaAppBootRuntime';
import { useDictaUiPreferences } from './useDictaUiPreferences';

type UseDictaRuntimeRootEnvironmentOptions = {
  localDevFeaturesAvailable: boolean;
};

export function useDictaRuntimeRootEnvironment({
  localDevFeaturesAvailable,
}: UseDictaRuntimeRootEnvironmentOptions) {
  const bootRuntime = useDictaAppBootRuntime();
  const accessRuntime = useDictaAccessRuntime({
    workspaceMode: bootRuntime.routing.workspaceMode,
    localDevFeaturesAvailable,
  });
  const uiPreferences = useDictaUiPreferences();
  const adaptiveWorkspaceState = useAdaptiveWorkspaceState();

  return {
    perfDiagnosticsEnabled: bootRuntime.perfDiagnosticsEnabled,
    sessionsState: bootRuntime.sessionsState,
    trainingState: bootRuntime.trainingState,
    routing: bootRuntime.routing,
    theme: bootRuntime.theme,
    browserTts: bootRuntime.browserTts,
    refs: bootRuntime.refs,
    accessRuntime,
    uiPreferences,
    adaptiveWorkspaceState,
  };
}

export type DictaRuntimeRootEnvironment = ReturnType<typeof useDictaRuntimeRootEnvironment>;
