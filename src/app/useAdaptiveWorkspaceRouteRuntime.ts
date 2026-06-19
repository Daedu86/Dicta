import { useMemo } from 'react';
import { buildRepeatWordStats } from './repeatWordStats';
import { useAdaptiveBenchmarkSectionProps } from './useAdaptiveBenchmarkSectionProps';
import { useAdaptiveExportActions } from './useAdaptiveExportActions';
import { useAdaptiveWorkspacePresentationState } from './useAdaptiveWorkspacePresentationState';
import type { AdaptiveSectionExpandedState } from './useAdaptiveWorkspaceEntryActions';

type PresentationArgs = Parameters<typeof useAdaptiveWorkspacePresentationState>[0];
type ExportArgs = Parameters<typeof useAdaptiveExportActions>[0];
type BenchmarkArgs = Parameters<typeof useAdaptiveBenchmarkSectionProps<AdaptiveSectionExpandedState>>[0];

type AdaptiveWorkspaceRouteExportArgs = Omit<ExportArgs, 'insightsDiagnosticProfile' | 'insightsDiagnosticFeedback'>;
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
  AdaptiveWorkspaceRouteBenchmarkArgs;

export type GroupedAdaptiveWorkspaceRouteRuntimeArgs = {
  presentation: PresentationArgs;
  exportActions: AdaptiveWorkspaceRouteExportArgs;
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

  const adaptiveBenchmarkSectionProps = useAdaptiveBenchmarkSectionProps<AdaptiveSectionExpandedState>({
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
    adaptiveBenchmarkSectionProps,
  };
}
