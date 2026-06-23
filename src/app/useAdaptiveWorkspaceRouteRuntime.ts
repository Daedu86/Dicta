import { useAdaptiveExportActions } from './useAdaptiveExportActions';
import { useAdaptiveWorkspacePresentationState } from './useAdaptiveWorkspacePresentationState';

type PresentationArgs = Parameters<typeof useAdaptiveWorkspacePresentationState>[0];
type ExportArgs = Parameters<typeof useAdaptiveExportActions>[0];

type AdaptiveWorkspaceRouteExportArgs = Omit<ExportArgs, 'insightsDiagnosticProfile' | 'insightsDiagnosticFeedback'>;

type FlatAdaptiveWorkspaceRouteRuntimeArgs = PresentationArgs &
  AdaptiveWorkspaceRouteExportArgs;

export type GroupedAdaptiveWorkspaceRouteRuntimeArgs = {
  presentation: PresentationArgs;
  exportActions: AdaptiveWorkspaceRouteExportArgs;
};

export type UseAdaptiveWorkspaceRouteRuntimeArgs =
  | FlatAdaptiveWorkspaceRouteRuntimeArgs
  | GroupedAdaptiveWorkspaceRouteRuntimeArgs;

function normalizeAdaptiveWorkspaceRouteRuntimeArgs(
  args: UseAdaptiveWorkspaceRouteRuntimeArgs,
): GroupedAdaptiveWorkspaceRouteRuntimeArgs {
  if ('presentation' in args) return args;

  return {
    presentation: args,
    exportActions: args,
  };
}

export function useAdaptiveWorkspaceRouteRuntime(args: UseAdaptiveWorkspaceRouteRuntimeArgs) {
  const routeArgs = normalizeAdaptiveWorkspaceRouteRuntimeArgs(args);
  const presentation = useAdaptiveWorkspacePresentationState(routeArgs.presentation);
  const exportActions = useAdaptiveExportActions({
    ...routeArgs.exportActions,
    insightsDiagnosticProfile: presentation.insightsDiagnosticProfile,
    insightsDiagnosticFeedback: presentation.insightsDiagnosticFeedback,
  });

  return {
    ...presentation,
    ...exportActions,
  };
}
