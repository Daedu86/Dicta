import type { useAdaptiveWorkspaceState } from './useAdaptiveWorkspaceState';
import { useAdaptiveWorkspaceRuntime } from './useAdaptiveWorkspaceRuntime';

type AdaptiveWorkspaceRuntimeOptions = Parameters<typeof useAdaptiveWorkspaceRuntime>[0];
type AdaptiveWorkspaceState = ReturnType<typeof useAdaptiveWorkspaceState>;

type UseDictaRootAdaptiveRuntimeOptions = Omit<
  AdaptiveWorkspaceRuntimeOptions,
  | 'adaptiveBenchmarksByInputLanguage'
  | 'setAdaptiveBenchmarksByInputLanguage'
  | 'adaptiveBenchmarksRef'
  | 'adaptiveSessionFeedbackByInputLanguage'
  | 'setAdaptiveSessionFeedbackByInputLanguage'
  | 'adaptiveSessionFeedbackRef'
  | 'setAdaptiveBenchmarksFocusAnchor'
  | 'setBenchmarkExportMessage'
  | 'setSessionFeedbackMessage'
> & {
  adaptiveWorkspaceState: AdaptiveWorkspaceState;
};

export function useDictaRootAdaptiveRuntime({
  adaptiveWorkspaceState,
  ...options
}: UseDictaRootAdaptiveRuntimeOptions) {
  return useAdaptiveWorkspaceRuntime({
    ...options,
    adaptiveBenchmarksByInputLanguage: adaptiveWorkspaceState.adaptiveBenchmarksByInputLanguage,
    setAdaptiveBenchmarksByInputLanguage: adaptiveWorkspaceState.setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef: adaptiveWorkspaceState.adaptiveBenchmarksRef,
    adaptiveSessionFeedbackByInputLanguage: adaptiveWorkspaceState.adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedbackByInputLanguage: adaptiveWorkspaceState.setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef: adaptiveWorkspaceState.adaptiveSessionFeedbackRef,
    setAdaptiveBenchmarksFocusAnchor: adaptiveWorkspaceState.setAdaptiveBenchmarksFocusAnchor,
    setBenchmarkExportMessage: adaptiveWorkspaceState.setBenchmarkExportMessage,
    setSessionFeedbackMessage: adaptiveWorkspaceState.setSessionFeedbackMessage,
  });
}
