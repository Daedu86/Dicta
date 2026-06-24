import { useMemo } from 'react';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type {
  OpenRouterJobNotification,
  TrainingGenerationNotice,
} from '../components/openrouter/types';
import type { TrainingGenerationButton } from '../components/training/TrainingGenerationCard';
import type { StoredSession } from './sessionTypes';
import { buildFocusedTrainingGenerationButtons } from './focusedTrainingGenerationButtonBuilders';
import type { OpenRouterDurationMinutes } from '../core/adaptive/openRouterGenerationPrompt';

type GenerateSessionAction = () => void | Promise<void>;

export type SessionQuotaStatusForGenerationButtons = {
  blocked: boolean;
  message: string;
};

export type UseFocusedTrainingGenerationButtonsArgs = {
  openRouterAccessAllowed: boolean;
  isOnline: boolean;
  activeSession: StoredSession | null;
  effectiveOpenRouterDefaultModel: string;
  sessionQuotaStatus: SessionQuotaStatusForGenerationButtons;
  openRouterOfflineTitle: string;
  activeOpenRouterJobs: ActiveOpenRouterJob[];
  openRouterJobNotifications: Record<string, OpenRouterJobNotification>;
  trainingGenerationNotices: Record<string, TrainingGenerationNotice>;
  trainingGenerationNowMs: number;
  cancelOpenRouterJob: (jobId: string) => void | Promise<void>;
  adaptiveOpenRouterBusy: boolean;
  topicOpenRouterBusy: boolean;
  directGenerationDurationMinutes: OpenRouterDurationMinutes;
  generateAdaptiveNextSessionFromOpenRouter: GenerateSessionAction;
  generateTopicNextSessionFromOpenRouter: GenerateSessionAction;
};

export type BuildFocusedTrainingGenerationButtonsArgs = Pick<
  UseFocusedTrainingGenerationButtonsArgs,
  | 'isOnline'
  | 'effectiveOpenRouterDefaultModel'
  | 'sessionQuotaStatus'
  | 'openRouterOfflineTitle'
  | 'activeOpenRouterJobs'
  | 'openRouterJobNotifications'
  | 'trainingGenerationNotices'
  | 'trainingGenerationNowMs'
  | 'cancelOpenRouterJob'
  | 'adaptiveOpenRouterBusy'
  | 'topicOpenRouterBusy'
  | 'directGenerationDurationMinutes'
  | 'generateAdaptiveNextSessionFromOpenRouter'
  | 'generateTopicNextSessionFromOpenRouter'
>;

export function useFocusedTrainingGenerationButtons({
  openRouterAccessAllowed,
  isOnline,
  activeSession,
  effectiveOpenRouterDefaultModel,
  sessionQuotaStatus,
  openRouterOfflineTitle,
  activeOpenRouterJobs,
  openRouterJobNotifications,
  trainingGenerationNotices,
  trainingGenerationNowMs,
  cancelOpenRouterJob,
  adaptiveOpenRouterBusy,
  topicOpenRouterBusy,
  directGenerationDurationMinutes,
  generateAdaptiveNextSessionFromOpenRouter,
  generateTopicNextSessionFromOpenRouter,
}: UseFocusedTrainingGenerationButtonsArgs): TrainingGenerationButton[] {
  return useMemo(() => {
    if (!openRouterAccessAllowed) return [];

    return buildFocusedTrainingGenerationButtons({
      isOnline,
      effectiveOpenRouterDefaultModel,
      sessionQuotaStatus,
      openRouterOfflineTitle,
      activeOpenRouterJobs,
      openRouterJobNotifications,
      trainingGenerationNotices,
      trainingGenerationNowMs,
      cancelOpenRouterJob,
      adaptiveOpenRouterBusy,
      topicOpenRouterBusy,
      directGenerationDurationMinutes,
      generateAdaptiveNextSessionFromOpenRouter,
      generateTopicNextSessionFromOpenRouter,
    });
  }, [
    openRouterAccessAllowed,
    effectiveOpenRouterDefaultModel,
    trainingGenerationNotices,
    openRouterJobNotifications,
    activeOpenRouterJobs,
    cancelOpenRouterJob,
    trainingGenerationNowMs,
    sessionQuotaStatus.blocked,
    sessionQuotaStatus.message,
    openRouterOfflineTitle,
    isOnline,
    activeSession,
    adaptiveOpenRouterBusy,
    topicOpenRouterBusy,
    directGenerationDurationMinutes,
    generateAdaptiveNextSessionFromOpenRouter,
    generateTopicNextSessionFromOpenRouter,
  ]);
}
