import { useMemo } from 'react';
import type { InputMode } from '../core/adaptive/types';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type {
  BenchmarkLanguageButton,
  OpenRouterJobNotification,
  OpenRouterWorkspaceProps,
} from '../components/openrouter/types';
import { persistOpenRouterDefaultModel } from './modelPreferenceStorage';

type UseOpenRouterWorkspacePropsArgs = {
  defaultModel: string;
  assignedModel: string;
  getAuthHeaders: () => Record<string, string>;
  setOpenRouterDefaultModel: (value: string) => void;
  models: OpenRouterWorkspaceProps['models'];
  status: OpenRouterWorkspaceProps['status'];
  error: string;
  onRefreshModels: () => Promise<void>;
  onBackToTraining: () => void;
  exportProfile: OpenRouterWorkspaceProps['exportProfile'];
  exportSessionFeedback: OpenRouterWorkspaceProps['exportSessionFeedback'];
  getBenchmarkActiveSessionStatus: (profile: OpenRouterWorkspaceProps['exportProfile']) => string | undefined;
  benchmarks: OpenRouterWorkspaceProps['benchmarks'];
  sessionFeedbackByInputLanguage: OpenRouterWorkspaceProps['sessionFeedbackByInputLanguage'];
  setSelectedBenchmarkInputMode: (inputMode: InputMode) => void;
  setSelectedBenchmarkLanguage: (language: BenchmarkLanguageButton) => void;
  setBenchmarkExportMessage: (message: string) => void;
  setSessionFeedbackMessage: (message: string) => void;
  defaultGenerateInputMode: InputMode;
  defaultGenerateLanguage: BenchmarkLanguageButton;
  focusGenerateRequest: number;
  activeJobs: ActiveOpenRouterJob[];
  jobNotifications: Record<string, OpenRouterJobNotification>;
  generationNowMs: number;
  onTrackJob: (job: ActiveOpenRouterJob) => void;
  onCreateGenerationErrorSession: OpenRouterWorkspaceProps['onCreateGenerationErrorSession'];
  onCopyBenchmark: OpenRouterWorkspaceProps['onCopyBenchmark'];
  onExportBenchmark: OpenRouterWorkspaceProps['onExportBenchmark'];
  onCopyBenchmarkWithScriptPrompt: OpenRouterWorkspaceProps['onCopyBenchmarkWithScriptPrompt'];
  onCopyBenchmarkFeedbackPrompt: OpenRouterWorkspaceProps['onCopyBenchmarkFeedbackPrompt'];
  onCopyBenchmarkFeedback: OpenRouterWorkspaceProps['onCopyBenchmarkFeedback'];
  onCopySessionFeedback: OpenRouterWorkspaceProps['onCopySessionFeedback'];
  onCopyScriptPrompt: OpenRouterWorkspaceProps['onCopyScriptPrompt'];
  onCopyScriptTemplate: OpenRouterWorkspaceProps['onCopyScriptTemplate'];
  onCopyBenchmarkFeedbackPromptWithHumanFeedback: OpenRouterWorkspaceProps['onCopyBenchmarkFeedbackPromptWithHumanFeedback'];
};

export function useOpenRouterWorkspaceProps({
  defaultModel,
  assignedModel,
  getAuthHeaders,
  setOpenRouterDefaultModel,
  models,
  status,
  error,
  onRefreshModels,
  onBackToTraining,
  exportProfile,
  exportSessionFeedback,
  getBenchmarkActiveSessionStatus,
  benchmarks,
  sessionFeedbackByInputLanguage,
  setSelectedBenchmarkInputMode,
  setSelectedBenchmarkLanguage,
  setBenchmarkExportMessage,
  setSessionFeedbackMessage,
  defaultGenerateInputMode,
  defaultGenerateLanguage,
  focusGenerateRequest,
  activeJobs,
  jobNotifications,
  generationNowMs,
  onTrackJob,
  onCreateGenerationErrorSession,
  onCopyBenchmark,
  onExportBenchmark,
  onCopyBenchmarkWithScriptPrompt,
  onCopyBenchmarkFeedbackPrompt,
  onCopyBenchmarkFeedback,
  onCopySessionFeedback,
  onCopyScriptPrompt,
  onCopyScriptTemplate,
  onCopyBenchmarkFeedbackPromptWithHumanFeedback,
}: UseOpenRouterWorkspacePropsArgs): OpenRouterWorkspaceProps {
  return useMemo(() => ({
    defaultModel,
    assignedModel: assignedModel || null,
    authHeaders: getAuthHeaders(),
    onSetDefaultModel: (value: string) => {
      setOpenRouterDefaultModel(value);
      persistOpenRouterDefaultModel(value);
    },
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
    exportProfile,
    exportSessionFeedback,
    exportActiveSessionStatus: getBenchmarkActiveSessionStatus(exportProfile),
    benchmarks,
    sessionFeedbackByInputLanguage,
    onSelectExportProfile: (inputMode, language) => {
      setSelectedBenchmarkInputMode(inputMode);
      setSelectedBenchmarkLanguage(language);
      setBenchmarkExportMessage('');
      setSessionFeedbackMessage('');
    },
    defaultGenerateInputMode,
    defaultGenerateLanguage,
    focusGenerateRequest,
    activeJobs,
    jobNotifications,
    generationNowMs,
    onTrackJob,
    onCreateGenerationErrorSession,
    onCopyBenchmark,
    onExportBenchmark,
    onCopyBenchmarkWithScriptPrompt,
    onCopyBenchmarkFeedbackPrompt,
    onCopyBenchmarkFeedback,
    onCopySessionFeedback,
    onCopyScriptPrompt,
    onCopyScriptTemplate,
    onCopyBenchmarkFeedbackPromptWithHumanFeedback,
  }), [
    defaultModel,
    assignedModel,
    getAuthHeaders,
    setOpenRouterDefaultModel,
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
    exportProfile,
    exportSessionFeedback,
    getBenchmarkActiveSessionStatus,
    benchmarks,
    sessionFeedbackByInputLanguage,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    setBenchmarkExportMessage,
    setSessionFeedbackMessage,
    defaultGenerateInputMode,
    defaultGenerateLanguage,
    focusGenerateRequest,
    activeJobs,
    jobNotifications,
    generationNowMs,
    onTrackJob,
    onCreateGenerationErrorSession,
    onCopyBenchmark,
    onExportBenchmark,
    onCopyBenchmarkWithScriptPrompt,
    onCopyBenchmarkFeedbackPrompt,
    onCopyBenchmarkFeedback,
    onCopySessionFeedback,
    onCopyScriptPrompt,
    onCopyScriptTemplate,
    onCopyBenchmarkFeedbackPromptWithHumanFeedback,
  ]);
}
