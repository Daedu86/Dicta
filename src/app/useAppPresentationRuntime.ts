import { useWorkspacePanelPropsRuntime } from './useWorkspacePanelPropsRuntime';
import { useAppShellHeaderRuntime } from './useAppShellHeaderRuntime';
import { useAuthWorkspaceRuntime } from './useAuthWorkspaceRuntime';
import { useSessionCreateCardRuntime } from './useSessionCreateCardRuntime';
import { useLiveMetricsDockRuntime } from './useLiveMetricsDockRuntime';

type UseAppPresentationRuntimeArgs =
  Parameters<typeof useWorkspacePanelPropsRuntime>[0] &
  Parameters<typeof useAppShellHeaderRuntime>[0] &
  Parameters<typeof useAuthWorkspaceRuntime>[0] &
  Parameters<typeof useSessionCreateCardRuntime>[0] &
  Parameters<typeof useLiveMetricsDockRuntime>[0];

export function useAppPresentationRuntime(args: UseAppPresentationRuntimeArgs) {
  const {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    leaderboardWorkspaceProps,
  } = useWorkspacePanelPropsRuntime(args);

  const { appShellHeaderProps } = useAppShellHeaderRuntime(args);
  const { authWorkspaceProps } = useAuthWorkspaceRuntime(args);
  const { sessionCreateCardProps } = useSessionCreateCardRuntime(args);
  const { liveMetricsDockProps } = useLiveMetricsDockRuntime(args);

  return {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    leaderboardWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  };
}
