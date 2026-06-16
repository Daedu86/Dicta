import { useWorkspacePanelPropsRuntime } from './useWorkspacePanelPropsRuntime';
import { useAppShellHeaderRuntime } from './useAppShellHeaderRuntime';
import { useAuthWorkspaceRuntime } from './useAuthWorkspaceRuntime';
import { useSessionCreateCardRuntime } from './useSessionCreateCardRuntime';
import { useLiveMetricsDockRuntime } from './useLiveMetricsDockRuntime';

type UseAppPresentationRuntimeFlatArgs =
  Parameters<typeof useWorkspacePanelPropsRuntime>[0] &
  Parameters<typeof useAppShellHeaderRuntime>[0] &
  Parameters<typeof useAuthWorkspaceRuntime>[0] &
  Parameters<typeof useSessionCreateCardRuntime>[0] &
  Parameters<typeof useLiveMetricsDockRuntime>[0];

type UseAppPresentationRuntimeGroupedArgs = {
  workspacePanels: Parameters<typeof useWorkspacePanelPropsRuntime>[0];
  appShellHeader: Parameters<typeof useAppShellHeaderRuntime>[0];
  authWorkspace: Parameters<typeof useAuthWorkspaceRuntime>[0];
  sessionCreateCard: Parameters<typeof useSessionCreateCardRuntime>[0];
  liveMetricsDock: Parameters<typeof useLiveMetricsDockRuntime>[0];
};

type UseAppPresentationRuntimeArgs =
  | UseAppPresentationRuntimeFlatArgs
  | UseAppPresentationRuntimeGroupedArgs;

function isGroupedAppPresentationRuntimeArgs(
  args: UseAppPresentationRuntimeArgs,
): args is UseAppPresentationRuntimeGroupedArgs {
  return 'workspacePanels' in args;
}

export function useAppPresentationRuntime(args: UseAppPresentationRuntimeArgs) {
  const workspacePanelArgs = isGroupedAppPresentationRuntimeArgs(args)
    ? args.workspacePanels
    : args;
  const appShellHeaderArgs = isGroupedAppPresentationRuntimeArgs(args)
    ? args.appShellHeader
    : args;
  const authWorkspaceArgs = isGroupedAppPresentationRuntimeArgs(args)
    ? args.authWorkspace
    : args;
  const sessionCreateCardArgs = isGroupedAppPresentationRuntimeArgs(args)
    ? args.sessionCreateCard
    : args;
  const liveMetricsDockArgs = isGroupedAppPresentationRuntimeArgs(args)
    ? args.liveMetricsDock
    : args;

  const {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
  } = useWorkspacePanelPropsRuntime(workspacePanelArgs);

  const { appShellHeaderProps } = useAppShellHeaderRuntime(appShellHeaderArgs);
  const { authWorkspaceProps } = useAuthWorkspaceRuntime(authWorkspaceArgs);
  const { sessionCreateCardProps } = useSessionCreateCardRuntime(sessionCreateCardArgs);
  const { liveMetricsDockProps } = useLiveMetricsDockRuntime(liveMetricsDockArgs);

  return {
    openRouterWorkspaceProps,
    adminWorkspaceProps,
    appShellHeaderProps,
    authWorkspaceProps,
    sessionCreateCardProps,
    liveMetricsDockProps,
  };
}
