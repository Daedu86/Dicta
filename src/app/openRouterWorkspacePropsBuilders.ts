import type { OpenRouterWorkspaceProps } from '../components/openrouter/types';
import { persistOpenRouterDefaultModel } from './modelPreferenceStorage';
import type { UseOpenRouterWorkspacePropsArgs } from './useOpenRouterWorkspaceProps';

type OpenRouterWorkspaceSelectionArgs = Pick<
  UseOpenRouterWorkspacePropsArgs,
  | 'setSelectedBenchmarkInputMode'
  | 'setSelectedBenchmarkLanguage'
  | 'setBenchmarkExportMessage'
  | 'setSessionFeedbackMessage'
>;

type OpenRouterWorkspaceModelArgs = Pick<
  UseOpenRouterWorkspacePropsArgs,
  'defaultModel' | 'assignedModel' | 'getAuthHeaders' | 'setOpenRouterDefaultModel'
>;

export function buildOpenRouterWorkspaceProps(args: UseOpenRouterWorkspacePropsArgs): OpenRouterWorkspaceProps {
  const {
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
  } = args;

  return {
    ...buildOpenRouterWorkspaceModelProps(args),
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
    onSelectExportProfile: buildOpenRouterExportProfileSelector(args),
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
  };
}

function buildOpenRouterWorkspaceModelProps({
  defaultModel,
  assignedModel,
  getAuthHeaders,
  setOpenRouterDefaultModel,
}: OpenRouterWorkspaceModelArgs): Pick<
  OpenRouterWorkspaceProps,
  'defaultModel' | 'assignedModel' | 'authHeaders' | 'onSetDefaultModel'
> {
  return {
    defaultModel,
    assignedModel: assignedModel || null,
    authHeaders: getAuthHeaders(),
    onSetDefaultModel: (value: string) => {
      setOpenRouterDefaultModel(value);
      persistOpenRouterDefaultModel(value);
    },
  };
}

function buildOpenRouterExportProfileSelector({
  setSelectedBenchmarkInputMode,
  setSelectedBenchmarkLanguage,
  setBenchmarkExportMessage,
  setSessionFeedbackMessage,
}: OpenRouterWorkspaceSelectionArgs): OpenRouterWorkspaceProps['onSelectExportProfile'] {
  return (inputMode, language) => {
    setSelectedBenchmarkInputMode(inputMode);
    setSelectedBenchmarkLanguage(language);
    setBenchmarkExportMessage('');
    setSessionFeedbackMessage('');
  };
}
