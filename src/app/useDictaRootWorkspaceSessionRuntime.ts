import { useWorkspaceNavigationEffects } from './useWorkspaceNavigationEffects';
import { useWorkspaceSessionRuntime } from './useWorkspaceSessionRuntime';

type WorkspaceNavigationEffectsOptions = Parameters<typeof useWorkspaceNavigationEffects>[0];
type WorkspaceSessionRuntimeOptions = Parameters<typeof useWorkspaceSessionRuntime>[0];

type UseDictaRootWorkspaceSessionRuntimeOptions =
  WorkspaceNavigationEffectsOptions &
  WorkspaceSessionRuntimeOptions;

export function useDictaRootWorkspaceSessionRuntime(
  options: UseDictaRootWorkspaceSessionRuntimeOptions,
) {
  useWorkspaceNavigationEffects(options);
  return useWorkspaceSessionRuntime(options);
}
