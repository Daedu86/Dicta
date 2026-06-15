import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdaptiveWorkspaceFocusAnchor } from '../components/adaptive-workspace/types';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import type { AdaptiveSectionExpandedState } from './useAdaptiveWorkspaceEntryActions';
import type { StoredSession } from './sessionTypes';
import { useAdaptiveDiagnosticsUiState } from './useAdaptiveDiagnosticsUiState';
import { useAdaptiveRuntime } from './useAdaptiveRuntime';
import { useAdaptiveStoragePersistenceEffects } from './useAdaptiveStoragePersistenceEffects';
import { useAdaptiveWorkspaceEntryActions } from './useAdaptiveWorkspaceEntryActions';
import { useDictaDebugExportEffect } from './useDictaDebugExportEffect';

interface UseAdaptiveWorkspaceRuntimeArgs {
  activeSession: StoredSession | null;
  activeSessionId: string;
  sessions: StoredSession[];
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  setAdaptiveBenchmarksByInputLanguage: Dispatch<SetStateAction<AdaptiveBenchmarksByInputLanguage>>;
  adaptiveBenchmarksRef: { current: AdaptiveBenchmarksByInputLanguage };
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  setAdaptiveSessionFeedbackByInputLanguage: Dispatch<SetStateAction<AdaptiveSessionFeedbackByInputLanguage>>;
  adaptiveSessionFeedbackRef: { current: AdaptiveSessionFeedbackByInputLanguage };
  persistAndPushAdaptiveSessionFeedbackNow: (feedback: AdaptiveSessionFeedbackByInputLanguage) => void;
  localStorageReadyForEffectiveProfile: boolean;
  perfDiagnosticsEnabled: boolean;
  dictaLanguageView: BenchmarkLanguageButton;
  setDictaLanguageView: (language: BenchmarkLanguageButton) => void;
  showAdaptiveWorkspace: () => void;
  setAdaptiveBenchmarksFocusAnchor: Dispatch<SetStateAction<AdaptiveWorkspaceFocusAnchor>>;
  setAdaptiveSectionExpanded: Dispatch<SetStateAction<AdaptiveSectionExpandedState>>;
  setBenchmarkExportMessage: Dispatch<SetStateAction<string>>;
  setSessionFeedbackMessage: Dispatch<SetStateAction<string>>;
  isMobileViewport: () => boolean;
}

export function useAdaptiveWorkspaceRuntime(args: UseAdaptiveWorkspaceRuntimeArgs) {
  const diagnosticsUiState = useAdaptiveDiagnosticsUiState();
  const adaptiveRuntime = useAdaptiveRuntime({
    activeSession: args.activeSession,
    activeSessionId: args.activeSessionId,
    sessions: args.sessions,
    setAdaptiveBenchmarks: args.setAdaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef: args.adaptiveBenchmarksRef,
    adaptiveSessionFeedback: args.adaptiveSessionFeedbackByInputLanguage,
    setAdaptiveSessionFeedback: args.setAdaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef: args.adaptiveSessionFeedbackRef,
    persistAdaptiveSessionFeedbackNow: args.persistAndPushAdaptiveSessionFeedbackNow,
    selectedBenchmarkLanguage: args.dictaLanguageView,
    setSelectedBenchmarkLanguage: args.setDictaLanguageView,
  });
  const { ensureLatestBrowserTtsDeDictationScriptFeedback } = adaptiveRuntime;

  useAdaptiveStoragePersistenceEffects({
    adaptiveBenchmarksByInputLanguage: args.adaptiveBenchmarksByInputLanguage,
    adaptiveBenchmarksRef: args.adaptiveBenchmarksRef,
    adaptiveSessionFeedbackByInputLanguage: args.adaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef: args.adaptiveSessionFeedbackRef,
    localStorageReadyForEffectiveProfile: args.localStorageReadyForEffectiveProfile,
  });

  useDictaDebugExportEffect({
    activeSessionId: args.activeSessionId,
    adaptiveBenchmarksByInputLanguage: args.adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage: args.adaptiveSessionFeedbackByInputLanguage,
    perfDiagnosticsEnabled: args.perfDiagnosticsEnabled,
    phrasePlaybackEventsRef: adaptiveRuntime.phrasePlaybackEventsRef,
  });

  useEffect(() => {
    ensureLatestBrowserTtsDeDictationScriptFeedback(args.sessions);
  }, [ensureLatestBrowserTtsDeDictationScriptFeedback, args.sessions]);

  const entryActions = useAdaptiveWorkspaceEntryActions({
    activeSession: args.activeSession,
    dictaLanguageView: args.dictaLanguageView,
    showAdaptiveWorkspace: args.showAdaptiveWorkspace,
    setSelectedBenchmarkInputMode: adaptiveRuntime.setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage: adaptiveRuntime.setSelectedBenchmarkLanguage,
    setBenchmarkExportMessage: args.setBenchmarkExportMessage,
    setSessionFeedbackMessage: args.setSessionFeedbackMessage,
    setAdaptiveBenchmarksFocusAnchor: args.setAdaptiveBenchmarksFocusAnchor,
    setAdaptiveSectionExpanded: args.setAdaptiveSectionExpanded,
    isMobileViewport: args.isMobileViewport,
  });

  return {
    ...diagnosticsUiState,
    ...adaptiveRuntime,
    ...entryActions,
  };
}
