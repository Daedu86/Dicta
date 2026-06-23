import { useMemo } from 'react';
import type { InputMode } from '../core/adaptive/types';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type {
  BenchmarkLanguageButton,
  OpenRouterJobNotification,
  OpenRouterWorkspaceProps,
} from '../components/openrouter/types';
import { buildOpenRouterWorkspaceProps } from './openRouterWorkspacePropsBuilders';

export type UseOpenRouterWorkspacePropsArgs = {
  defaultModel: string;
  assignedModel: string;
  getAuthHeaders: () => Record<string, string>;
  setOpenRouterDefaultModel: (value: string) => void;
  models: OpenRouterWorkspaceProps['models'];
  status: OpenRouterWorkspaceProps['status'];
  error: string;
  onRefreshModels: () => Promise<void>;
  onBackToTraining: () => void;
  benchmarks: OpenRouterWorkspaceProps['benchmarks'];
  sessionFeedbackByInputLanguage: OpenRouterWorkspaceProps['sessionFeedbackByInputLanguage'];
  defaultGenerateInputMode: InputMode;
  defaultGenerateLanguage: BenchmarkLanguageButton;
  focusGenerateRequest: number;
  activeJobs: ActiveOpenRouterJob[];
  jobNotifications: Record<string, OpenRouterJobNotification>;
  generationNowMs: number;
  onTrackJob: (job: ActiveOpenRouterJob) => void;
  onCreateGenerationErrorSession: OpenRouterWorkspaceProps['onCreateGenerationErrorSession'];
};

export function useOpenRouterWorkspaceProps(args: UseOpenRouterWorkspacePropsArgs): OpenRouterWorkspaceProps {
  const {
    defaultModel,
    assignedModel,
    getAuthHeaders,
    setOpenRouterDefaultModel,
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
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
  } = args;

  return useMemo(() => buildOpenRouterWorkspaceProps(args), [
    defaultModel,
    assignedModel,
    getAuthHeaders,
    setOpenRouterDefaultModel,
    models,
    status,
    error,
    onRefreshModels,
    onBackToTraining,
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
  ]);
}
