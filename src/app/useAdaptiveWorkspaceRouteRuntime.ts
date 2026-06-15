import { useMemo } from 'react';
import { buildRepeatWordStats } from './repeatWordStats';
import { useAdaptiveAdvancedDiagnosticsProps } from './useAdaptiveAdvancedDiagnosticsProps';
import { useAdaptiveBenchmarkSectionProps } from './useAdaptiveBenchmarkSectionProps';
import { useAdaptiveExportActions } from './useAdaptiveExportActions';
import { useAdaptiveWorkspacePresentationState } from './useAdaptiveWorkspacePresentationState';

type PresentationArgs = Parameters<typeof useAdaptiveWorkspacePresentationState>[0];
type ExportArgs = Parameters<typeof useAdaptiveExportActions>[0];
type DiagnosticsArgs = Parameters<typeof useAdaptiveAdvancedDiagnosticsProps>[0];
type BenchmarkArgs = Parameters<typeof useAdaptiveBenchmarkSectionProps<DiagnosticsArgs['adaptiveSectionExpanded']>>[0];

type AdaptiveWorkspaceRouteExportArgs = Omit<ExportArgs, 'insightsDiagnosticProfile' | 'insightsDiagnosticFeedback'>;
type AdaptiveWorkspaceRouteDiagnosticsArgs = Omit<
  DiagnosticsArgs,
  'adaptiveAdapters' | 'latestInputAdapter' | 'latestAdaptiveMode'
>;
type AdaptiveWorkspaceRouteBenchmarkArgs = Omit<
  BenchmarkArgs,
  | 'adaptiveAdapters'
  | 'selectedBenchmarkProfile'
  | 'selectedSessionFeedback'
  | 'repeatWordStats'
  | 'copySelectedBenchmarkJson'
  | 'downloadSelectedBenchmarkJson'
  | 'copyDictationScriptPrompt'
  | 'copyBenchmarkWithDictationScriptPrompt'
  | 'copyDictationScriptTemplate'
  | 'copySessionFeedbackJson'
  | 'copyBenchmarkFeedbackJson'
  | 'copyBenchmarkFeedbackPrompt'
  | 'copyBenchmarkFeedbackPromptWithHumanFeedback'
>;

type FlatAdaptiveWorkspaceRouteRuntimeArgs = PresentationArgs &
  AdaptiveWorkspaceRouteExportArgs &
  AdaptiveWorkspaceRouteDiagnosticsArgs &
  AdaptiveWorkspaceRouteBenchmarkArgs;

export type GroupedAdaptiveWorkspaceRouteRuntimeArgs = {
  presentation: PresentationArgs;
  exportActions: AdaptiveWorkspaceRouteExportArgs;
  diagnostics: AdaptiveWorkspaceRouteDiagnosticsArgs;
  benchmark: AdaptiveWorkspaceRouteBenchmarkArgs;
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
    diagnostics: args,
    benchmark: args,
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

  const repeatWordStats = useMemo(
    () => buildRepeatWordStats({
      sessions: routeArgs.exportActions.sessions,
      inputMode: routeArgs.presentation.selectedBenchmarkInputMode,
      language: routeArgs.presentation.selectedBenchmarkLanguage,
      now: new Date(),
    }),
    [
      routeArgs.exportActions.sessions,
      routeArgs.presentation.selectedBenchmarkInputMode,
      routeArgs.presentation.selectedBenchmarkLanguage,
    ],
  );

  const adaptiveAdvancedDiagnosticsProps = useAdaptiveAdvancedDiagnosticsProps({
    ...routeArgs.diagnostics,
    adaptiveAdapters: presentation.adaptiveAdapters,
    latestInputAdapter: presentation.latestInputAdapter,
    latestAdaptiveMode: presentation.latestAdaptiveMode,
  });

  const adaptiveBenchmarkSectionProps = useAdaptiveBenchmarkSectionProps({
    ...routeArgs.benchmark,
    adaptiveAdapters: presentation.adaptiveAdapters,
    selectedBenchmarkProfile: presentation.selectedBenchmarkProfile,
    selectedSessionFeedback: presentation.selectedSessionFeedback,
    repeatWordStats,
    copySelectedBenchmarkJson: exportActions.copySelectedBenchmarkJson,
    downloadSelectedBenchmarkJson: exportActions.downloadSelectedBenchmarkJson,
    copyDictationScriptPrompt: exportActions.copyDictationScriptPrompt,
    copyBenchmarkWithDictationScriptPrompt: exportActions.copyBenchmarkWithDictationScriptPrompt,
    copyDictationScriptTemplate: exportActions.copyDictationScriptTemplate,
    copySessionFeedbackJson: exportActions.copySessionFeedbackJson,
    copyBenchmarkFeedbackJson: exportActions.copyBenchmarkFeedbackJson,
    copyBenchmarkFeedbackPrompt: exportActions.copyBenchmarkFeedbackPrompt,
    copyBenchmarkFeedbackPromptWithHumanFeedback: exportActions.copyBenchmarkFeedbackPromptWithHumanFeedback,
  });

  return {
    ...presentation,
    ...exportActions,
    repeatWordStats,
    adaptiveAdvancedDiagnosticsProps,
    adaptiveBenchmarkSectionProps,
  };
}
