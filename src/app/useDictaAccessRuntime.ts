import { useAdminFileInventory } from './useAdminFileInventory';
import { useAdminProfileAccessActions } from './useAdminProfileAccessActions';
import { useAuthProfileRuntime } from './useAuthProfileRuntime';
import { useDictaSupabaseRuntime } from './useDictaSupabaseRuntime';
import { useOpenRouterModelRuntime } from './useOpenRouterModelRuntime';
import type { WorkspaceMode } from './useWorkspaceRouting';

type UseDictaAccessRuntimeOptions = {
  workspaceMode: WorkspaceMode;
  localDevFeaturesAvailable: boolean;
};

export function useDictaAccessRuntime({
  workspaceMode,
  localDevFeaturesAvailable,
}: UseDictaAccessRuntimeOptions) {
  const {
    syncConfig,
    supabaseClient,
  } = useDictaSupabaseRuntime();
  const authProfileRuntime = useAuthProfileRuntime({
    syncConfig,
    supabaseClient,
  });
  const openRouterModelRuntime = useOpenRouterModelRuntime({
    syncConfig,
    appProfile: authProfileRuntime.appProfile,
    getAuthHeaders: authProfileRuntime.getAuthHeaders,
  });
  const adminFileInventoryRuntime = useAdminFileInventory({
    workspaceMode,
    localDevFeaturesAvailable,
  });
  const adminProfileAccessRuntime = useAdminProfileAccessActions({
    getAuthHeaders: authProfileRuntime.getAuthHeaders,
    appProfile: authProfileRuntime.appProfile,
    setAppProfile: authProfileRuntime.setAppProfile,
    setVisibleProfiles: authProfileRuntime.setVisibleProfiles,
  });

  return {
    syncConfig,
    supabaseClient,
    ...authProfileRuntime,
    ...openRouterModelRuntime,
    ...adminFileInventoryRuntime,
    ...adminProfileAccessRuntime,
  };
}
