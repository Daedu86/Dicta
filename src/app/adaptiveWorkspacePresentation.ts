import {
  createEmptyInputLanguageBenchmark,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  selectLatestAdaptiveSessionFeedback,
} from '../core/adaptive/sessionFeedback';
import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  InputMode,
  LanguageCode,
} from '../core/adaptive/types';
import {
  buildAdaptiveAdapterCards,
  formatAdaptiveModeFromSession,
} from './sessionDisplayFormatters';
import type { StoredSession } from './sessionTypes';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';

export type AdaptiveWorkspaceInputOption = {
  inputMode: InputMode;
  label: string;
};

export type AdaptiveAdapterCard = ReturnType<typeof buildAdaptiveAdapterCards>[number];

export type AdaptiveWorkspacePresentationState = {
  adaptiveAdapters: AdaptiveAdapterCard[];
  selectedBenchmarkProfile: InputLanguageBenchmarkMetrics;
  selectedSessionFeedback: AdaptiveSessionFeedback | null;
  insightsDiagnosticProfile: InputLanguageBenchmarkMetrics;
  insightsDiagnosticFeedback: AdaptiveSessionFeedback | null;
  insightsDiagnosticInputOptions: AdaptiveWorkspaceInputOption[];
  latestAdaptiveMode: string;
  latestInputAdapter: AdaptiveAdapterCard | null;
};

export type AdaptiveWorkspacePresentationInput = {
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  selectedBenchmarkInputMode: InputMode;
  selectedBenchmarkLanguage: BenchmarkLanguageButton;
  insightsDiagnosticInputMode: InputMode;
  metricsLanguageView: BenchmarkLanguageButton;
  latestSession: StoredSession | null;
};

export function buildAdaptiveWorkspaceInputOptions(): AdaptiveWorkspaceInputOption[] {
  return [
    { inputMode: 'browser-tts', label: 'Browser TTS' },
  ];
}

export function getAdaptiveBenchmarkProfile({
  adaptiveBenchmarksByInputLanguage,
  inputMode,
  language,
}: {
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  inputMode: InputMode;
  language: LanguageCode;
}): InputLanguageBenchmarkMetrics {
  return (
    adaptiveBenchmarksByInputLanguage[inputMode]?.[language] ??
    createEmptyInputLanguageBenchmark(inputMode, language)
  );
}

export function getLatestAdaptiveFeedback({
  adaptiveSessionFeedbackByInputLanguage,
  inputMode,
  language,
}: {
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  inputMode: InputMode;
  language: LanguageCode;
}): AdaptiveSessionFeedback | null {
  return selectLatestAdaptiveSessionFeedback(
    adaptiveSessionFeedbackByInputLanguage[inputMode]?.[language],
    inputMode,
    language,
  );
}

export function buildAdaptiveWorkspacePresentationState({
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  selectedBenchmarkInputMode,
  selectedBenchmarkLanguage,
  insightsDiagnosticInputMode,
  metricsLanguageView,
  latestSession,
}: AdaptiveWorkspacePresentationInput): AdaptiveWorkspacePresentationState {
  const adaptiveAdapters = buildAdaptiveAdapterCards();
  const selectedBenchmarkProfile = getAdaptiveBenchmarkProfile({
    adaptiveBenchmarksByInputLanguage,
    inputMode: selectedBenchmarkInputMode,
    language: selectedBenchmarkLanguage,
  });
  const selectedSessionFeedback = getLatestAdaptiveFeedback({
    adaptiveSessionFeedbackByInputLanguage,
    inputMode: selectedBenchmarkInputMode,
    language: selectedBenchmarkLanguage,
  });
  const insightsDiagnosticProfile = getAdaptiveBenchmarkProfile({
    adaptiveBenchmarksByInputLanguage,
    inputMode: insightsDiagnosticInputMode,
    language: metricsLanguageView,
  });
  const insightsDiagnosticFeedback = getLatestAdaptiveFeedback({
    adaptiveSessionFeedbackByInputLanguage,
    inputMode: insightsDiagnosticInputMode,
    language: metricsLanguageView,
  });
  const latestAdaptiveMode = latestSession ? formatAdaptiveModeFromSession(latestSession) : 'Balanced';
  const latestInputAdapter = latestSession
    ? adaptiveAdapters.find((adapter) => adapter.inputMode === latestSession.inputMode) ?? null
    : null;

  return {
    adaptiveAdapters,
    selectedBenchmarkProfile,
    selectedSessionFeedback,
    insightsDiagnosticProfile,
    insightsDiagnosticFeedback,
    insightsDiagnosticInputOptions: buildAdaptiveWorkspaceInputOptions(),
    latestAdaptiveMode,
    latestInputAdapter,
  };
}
