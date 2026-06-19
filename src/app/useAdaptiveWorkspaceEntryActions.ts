import type {
  Dispatch,
  SetStateAction,
} from 'react';
import type { AdaptiveWorkspaceFocusAnchor } from '../components/adaptive-workspace/types';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import type { InputMode } from '../core/adaptive/types';
import type { StoredSession } from './sessionTypes';
import { mapSessionInputMode } from './appRuntimeHelpers';

export type AdaptiveSectionExpandedState = {
  benchmarks: boolean;
};

export type AdaptiveWorkspaceEntryActionsOptions = {
  activeSession: StoredSession | null | undefined;
  dictaLanguageView: BenchmarkLanguageButton;
  showAdaptiveWorkspace: () => void;
  setSelectedBenchmarkInputMode: Dispatch<SetStateAction<InputMode>>;
  setSelectedBenchmarkLanguage: (language: BenchmarkLanguageButton) => void;
  setBenchmarkExportMessage: Dispatch<SetStateAction<string>>;
  setSessionFeedbackMessage: Dispatch<SetStateAction<string>>;
  setAdaptiveBenchmarksFocusAnchor: Dispatch<SetStateAction<AdaptiveWorkspaceFocusAnchor>>;
  setAdaptiveSectionExpanded: Dispatch<SetStateAction<AdaptiveSectionExpandedState>>;
  isMobileViewport: () => boolean;
};

export type AdaptiveWorkspaceEntryActions = {
  openAdaptiveExportsForActiveInput: () => void;
  openAdaptiveWorkspaceFromHeader: () => void;
};

export function createAdaptiveWorkspaceEntryActions({
  activeSession,
  dictaLanguageView,
  showAdaptiveWorkspace,
  setSelectedBenchmarkInputMode,
  setSelectedBenchmarkLanguage,
  setBenchmarkExportMessage,
  setSessionFeedbackMessage,
  setAdaptiveBenchmarksFocusAnchor,
  setAdaptiveSectionExpanded,
  isMobileViewport,
}: AdaptiveWorkspaceEntryActionsOptions): AdaptiveWorkspaceEntryActions {
  function openAdaptiveExportsForActiveInput(): void {
    if (!activeSession) return;
    const inputMode = mapSessionInputMode(activeSession.inputMode);
    setSelectedBenchmarkInputMode(inputMode);
    setSelectedBenchmarkLanguage(dictaLanguageView);
    setBenchmarkExportMessage('');
    setSessionFeedbackMessage('');
    setAdaptiveBenchmarksFocusAnchor('exports');
    setAdaptiveSectionExpanded((prev) => ({ ...prev, benchmarks: true }));
    showAdaptiveWorkspace();
  }

  function openAdaptiveWorkspaceFromHeader(): void {
    if (isMobileViewport()) {
      setAdaptiveSectionExpanded((prev) => ({
        ...prev,
        benchmarks: false,
      }));
    }
    showAdaptiveWorkspace();
  }

  return {
    openAdaptiveExportsForActiveInput,
    openAdaptiveWorkspaceFromHeader,
  };
}

export function useAdaptiveWorkspaceEntryActions(
  options: AdaptiveWorkspaceEntryActionsOptions,
): AdaptiveWorkspaceEntryActions {
  return createAdaptiveWorkspaceEntryActions(options);
}
