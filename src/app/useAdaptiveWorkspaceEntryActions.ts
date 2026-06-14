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
  decision: boolean;
  architecture: boolean;
  adapters: boolean;
  latest: boolean;
  live: boolean;
  telemetry: boolean;
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
        decision: false,
        architecture: false,
        adapters: false,
        latest: false,
        live: false,
        telemetry: false,
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
