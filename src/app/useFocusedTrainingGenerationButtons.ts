import { useMemo } from 'react';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type {
  OpenRouterJobNotification,
  TrainingGenerationNotice,
} from '../components/openrouter/types';
import type { TrainingGenerationButton } from '../components/training/TrainingGenerationCard';
import type { StoredSession } from './sessionTypes';
import { buildFocusedTrainingGenerationButtons } from './focusedTrainingGenerationButtonBuilders';

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
  directOpenRouterBusy: boolean;
  generateAdaptiveNextSessionFromOpenRouter: GenerateSessionAction;
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
  | 'directOpenRouterBusy'
  | 'generateAdaptiveNextSessionFromOpenRouter'
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
  directOpenRouterBusy,
  generateAdaptiveNextSessionFromOpenRouter,
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
      directOpenRouterBusy,
      generateAdaptiveNextSessionFromOpenRouter,
    });
  }, [
    openRouterAccessAllowed,
    effectiveOpenRouterDefaultModel,
    trainingGenerationNotices,
    openRouterJobNotifications,
    activeOpenRouterJobs,
    trainingGenerationNowMs,
    sessionQuotaStatus.blocked,
    sessionQuotaStatus.message,
    openRouterOfflineTitle,
    isOnline,
    activeSession,
    directOpenRouterBusy,
    generateAdaptiveNextSessionFromOpenRouter,
  ]);
}
