import type { OpenRouterWorkspaceProps } from '../components/openrouter/types';
import { persistOpenRouterDefaultModel } from './modelPreferenceStorage';
import type { UseOpenRouterWorkspacePropsArgs } from './useOpenRouterWorkspaceProps';

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
    sessions,
    benchmarks,
    sessionFeedbackByInputLanguage,
    recentDictationSessionHints,
    defaultGenerateInputMode,
    defaultGenerateLanguage,
    directGenerationDurationMinutes,
    onChangeDirectGenerationDurationMinutes,
    isOnline,
    openRouterOfflineTitle,
    adaptiveOpenRouterBusy,
    topicOpenRouterBusy,
    onGenerateAdaptiveDirectSession,
    onGenerateTopicDirectSession,
    focusGenerateRequest,
    activeJobs,
    jobNotifications,
    generationNowMs,
    onTrackJob,
    onCreateGenerationErrorSession,
  } = args;

  return {
    ...buildOpenRouterWorkspaceModelProps(args),
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
    sessions,
    benchmarks,
    sessionFeedbackByInputLanguage,
    recentDictationSessionHints,
    defaultGenerateInputMode,
    defaultGenerateLanguage,
    directGenerationDurationMinutes,
    onChangeDirectGenerationDurationMinutes,
    isOnline,
    openRouterOfflineTitle,
    adaptiveOpenRouterBusy,
    topicOpenRouterBusy,
    onGenerateAdaptiveDirectSession,
    onGenerateTopicDirectSession,
    focusGenerateRequest,
    activeJobs,
    jobNotifications,
    generationNowMs,
    onTrackJob,
    onCreateGenerationErrorSession,
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
