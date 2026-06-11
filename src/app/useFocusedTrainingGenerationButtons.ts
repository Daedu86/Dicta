import { useMemo } from 'react';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import {
  buildTrainingGenerationButtonNotice,
} from '../components/openrouter/openRouterViewHelpers';
import type {
  OpenRouterJobNotification,
  TrainingGenerationNotice,
} from '../components/openrouter/types';
import type { TrainingGenerationButton } from '../components/training/TrainingGenerationCard';
import type { StoredSession } from './sessionTypes';

type GenerateSessionAction = () => void | Promise<void>;

type SessionQuotaStatusForGenerationButtons = {
  blocked: boolean;
  message: string;
};

type UseFocusedTrainingGenerationButtonsArgs = {
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
  directIntermediateOpenRouterBusy: boolean;
  directAdvancedOpenRouterBusy: boolean;
  expressEasyOpenRouterBusy: boolean;
  expressIntermediateOpenRouterBusy: boolean;
  expressAdvancedOpenRouterBusy: boolean;
  generateEasyNextSessionFromOpenRouter: GenerateSessionAction;
  generateIntermediateNextSessionFromOpenRouter: GenerateSessionAction;
  generateAdvancedNextSessionFromOpenRouter: GenerateSessionAction;
  generateExpressEasyNextSessionFromOpenRouter: GenerateSessionAction;
  generateExpressIntermediateNextSessionFromOpenRouter: GenerateSessionAction;
  generateExpressAdvancedNextSessionFromOpenRouter: GenerateSessionAction;
  openOpenRouterGenerateForActiveInput: () => void;
};

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
  directIntermediateOpenRouterBusy,
  directAdvancedOpenRouterBusy,
  expressEasyOpenRouterBusy,
  expressIntermediateOpenRouterBusy,
  expressAdvancedOpenRouterBusy,
  generateEasyNextSessionFromOpenRouter,
  generateIntermediateNextSessionFromOpenRouter,
  generateAdvancedNextSessionFromOpenRouter,
  generateExpressEasyNextSessionFromOpenRouter,
  generateExpressIntermediateNextSessionFromOpenRouter,
  generateExpressAdvancedNextSessionFromOpenRouter,
  openOpenRouterGenerateForActiveInput,
}: UseFocusedTrainingGenerationButtonsArgs): TrainingGenerationButton[] {
  return useMemo(() => {
    if (!openRouterAccessAllowed) return [];

    const openRouterModelIsSet = Boolean(effectiveOpenRouterDefaultModel.trim());

    const buildNotice = (slotLabel: string, displayLabel: string) =>
      buildTrainingGenerationButtonNotice({
        slotLabel,
        displayLabel,
        notices: trainingGenerationNotices,
        jobNotifications: openRouterJobNotifications,
        activeJobs: activeOpenRouterJobs,
        nowMs: trainingGenerationNowMs,
      });

    const isGenerationRunning = (slotLabel: string) =>
      activeOpenRouterJobs.some((job) => job.slotLabel === slotLabel);

    const buildModelRequiredTitle = (fallbackTitle: string) =>
      sessionQuotaStatus.blocked
        ? sessionQuotaStatus.message
        : openRouterOfflineTitle || (openRouterModelIsSet ? fallbackTitle : 'Set a default OpenRouter model first.');

    const isModelGenerationDisabled = (busy: boolean, running: boolean) =>
      !isOnline || busy || running || !activeSession || !openRouterModelIsSet || sessionQuotaStatus.blocked;

    const easyGenerationNotice = buildNotice('Easy direct session', 'Easy session');
    const mediumGenerationNotice = buildNotice('Intermediate direct session', 'Medium session');
    const hardGenerationNotice = buildNotice('Advanced direct session', 'Hard session');
    const expressEasyGenerationNotice = buildNotice('Express easy direct session', 'Express easy session');
    const expressMediumGenerationNotice = buildNotice('Express intermediate direct session', 'Express medium session');
    const expressHardGenerationNotice = buildNotice('Express advanced direct session', 'Express hard session');

    const easyDirectGenerationRunning = isGenerationRunning('Easy direct session');
    const mediumDirectGenerationRunning = isGenerationRunning('Intermediate direct session');
    const hardDirectGenerationRunning = isGenerationRunning('Advanced direct session');
    const expressEasyGenerationRunning = isGenerationRunning('Express easy direct session');
    const expressMediumGenerationRunning = isGenerationRunning('Express intermediate direct session');
    const expressHardGenerationRunning = isGenerationRunning('Express advanced direct session');

    return [
      {
        id: 'easy',
        label: directOpenRouterBusy ? 'Requesting easy...' : easyDirectGenerationRunning ? 'Generating easy...' : 'New Easy Session',
        onClick: () => void generateEasyNextSessionFromOpenRouter(),
        disabled: isModelGenerationDisabled(directOpenRouterBusy, easyDirectGenerationRunning),
        title: buildModelRequiredTitle('Generate an easy two-minute session with OpenRouter.'),
        helpText: 'About 2 minutes. Easy level with simpler vocabulary, shorter clauses, and roughly 300 spoken words.',
        statusMessage: easyGenerationNotice?.message,
        statusTone: easyGenerationNotice?.tone,
      },
      {
        id: 'express-easy',
        label: expressEasyOpenRouterBusy ? 'Requesting express easy...' : expressEasyGenerationRunning ? 'Generating express easy...' : 'Express Easy Session',
        onClick: () => void generateExpressEasyNextSessionFromOpenRouter(),
        disabled: isModelGenerationDisabled(expressEasyOpenRouterBusy, expressEasyGenerationRunning),
        title: buildModelRequiredTitle('Generate an easy one-minute express session with OpenRouter.'),
        helpText: 'About 1 minute. Easy level, simpler vocabulary, and roughly half the spoken words of the standard easy session.',
        statusMessage: expressEasyGenerationNotice?.message,
        statusTone: expressEasyGenerationNotice?.tone,
      },
      {
        id: 'medium',
        label: directIntermediateOpenRouterBusy ? 'Requesting medium...' : mediumDirectGenerationRunning ? 'Generating medium...' : 'New Medium Session',
        onClick: () => void generateIntermediateNextSessionFromOpenRouter(),
        disabled: isModelGenerationDisabled(directIntermediateOpenRouterBusy, mediumDirectGenerationRunning),
        title: buildModelRequiredTitle('Generate a medium two-minute session with OpenRouter.'),
        helpText: 'About 2 minutes. Medium level with balanced vocabulary, natural phrasing, and roughly 300 spoken words.',
        statusMessage: mediumGenerationNotice?.message,
        statusTone: mediumGenerationNotice?.tone,
      },
      {
        id: 'express-medium',
        label: expressIntermediateOpenRouterBusy ? 'Requesting express medium...' : expressMediumGenerationRunning ? 'Generating express medium...' : 'Express Medium Session',
        onClick: () => void generateExpressIntermediateNextSessionFromOpenRouter(),
        disabled: isModelGenerationDisabled(expressIntermediateOpenRouterBusy, expressMediumGenerationRunning),
        title: buildModelRequiredTitle('Generate a medium one-minute express session with OpenRouter.'),
        helpText: 'About 1 minute. Medium level, balanced phrasing, and roughly half the spoken words of the standard medium session.',
        statusMessage: expressMediumGenerationNotice?.message,
        statusTone: expressMediumGenerationNotice?.tone,
      },
      {
        id: 'hard',
        label: directAdvancedOpenRouterBusy ? 'Requesting hard...' : hardDirectGenerationRunning ? 'Generating hard...' : 'New Hard Session',
        onClick: () => void generateAdvancedNextSessionFromOpenRouter(),
        disabled: isModelGenerationDisabled(directAdvancedOpenRouterBusy, hardDirectGenerationRunning),
        title: buildModelRequiredTitle('Generate a hard two-minute session with OpenRouter.'),
        helpText: 'About 2 minutes. Hard level with denser vocabulary, more complex grammar, and roughly 300 spoken words.',
        statusMessage: hardGenerationNotice?.message,
        statusTone: hardGenerationNotice?.tone,
      },
      {
        id: 'express-hard',
        label: expressAdvancedOpenRouterBusy ? 'Requesting express hard...' : expressHardGenerationRunning ? 'Generating express hard...' : 'Express Hard Session',
        onClick: () => void generateExpressAdvancedNextSessionFromOpenRouter(),
        disabled: isModelGenerationDisabled(expressAdvancedOpenRouterBusy, expressHardGenerationRunning),
        title: buildModelRequiredTitle('Generate a hard one-minute express session with OpenRouter.'),
        helpText: 'About 1 minute. Hard level, denser vocabulary, and roughly half the spoken words of the standard hard session.',
        statusMessage: expressHardGenerationNotice?.message,
        statusTone: expressHardGenerationNotice?.tone,
      },
      {
        id: 'custom',
        label: 'New Custom Session',
        onClick: openOpenRouterGenerateForActiveInput,
        disabled: !isOnline || !activeSession || sessionQuotaStatus.blocked,
        title: sessionQuotaStatus.blocked
          ? sessionQuotaStatus.message
          : openRouterOfflineTitle || 'Open the existing OpenRouter custom generation workspace.',
      },
    ];
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
    expressEasyOpenRouterBusy,
    directIntermediateOpenRouterBusy,
    expressIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    expressAdvancedOpenRouterBusy,
    generateEasyNextSessionFromOpenRouter,
    generateExpressEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateExpressIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
    generateExpressAdvancedNextSessionFromOpenRouter,
    openOpenRouterGenerateForActiveInput,
  ]);
}
