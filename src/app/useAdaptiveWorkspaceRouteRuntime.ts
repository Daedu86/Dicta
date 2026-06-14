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

export type UseAdaptiveWorkspaceRouteRuntimeArgs = PresentationArgs &
  Omit<ExportArgs, 'insightsDiagnosticProfile' | 'insightsDiagnosticFeedback'> &
  Omit<DiagnosticsArgs, 'adaptiveAdapters' | 'latestInputAdapter' | 'latestAdaptiveMode'> &
  Omit<
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

export function useAdaptiveWorkspaceRouteRuntime(args: UseAdaptiveWorkspaceRouteRuntimeArgs) {
  const presentation = useAdaptiveWorkspacePresentationState(args);
  const exportActions = useAdaptiveExportActions({
    ...args,
    insightsDiagnosticProfile: presentation.insightsDiagnosticProfile,
    insightsDiagnosticFeedback: presentation.insightsDiagnosticFeedback,
  });

  const repeatWordStats = useMemo(
    () => buildRepeatWordStats({
      sessions: args.sessions,
      inputMode: args.selectedBenchmarkInputMode,
      language: args.selectedBenchmarkLanguage,
      now: new Date(),
    }),
    [args.sessions, args.selectedBenchmarkInputMode, args.selectedBenchmarkLanguage],
  );

  const adaptiveAdvancedDiagnosticsProps = useAdaptiveAdvancedDiagnosticsProps({
    ...args,
    adaptiveAdapters: presentation.adaptiveAdapters,
    latestInputAdapter: presentation.latestInputAdapter,
    latestAdaptiveMode: presentation.latestAdaptiveMode,
  });

  const adaptiveBenchmarkSectionProps = useAdaptiveBenchmarkSectionProps({
    ...args,
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
