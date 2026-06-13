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
import {
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from './openRouterDirectGenerationPresets';

type GenerateSessionAction = () => void | Promise<void>;

type SessionQuotaStatusForGenerationButtons = {
  blocked: boolean;
  message: string;
};

type UseFocusedTrainingGenerationButtonsArgs = {
  allowCustomSessionGeneration: boolean;
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

type FocusedTrainingDirectGenerationButtonConfig = {
  preset: OpenRouterDirectGenerationPreset;
  busy: boolean;
  requestingLabel: string;
  runningLabel: string;
  readyLabel: string;
  action: GenerateSessionAction;
  title: string;
  helpText: string;
};

export function useFocusedTrainingGenerationButtons({
  allowCustomSessionGeneration,
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

    const buildDirectGenerationButton = ({
      preset,
      busy,
      requestingLabel,
      runningLabel,
      readyLabel,
      action,
      title,
      helpText,
    }: FocusedTrainingDirectGenerationButtonConfig): TrainingGenerationButton => {
      const running = isGenerationRunning(preset.slotLabel);
      const notice = buildNotice(preset.slotLabel, preset.displayLabel);

      return {
        id: preset.id,
        label: busy ? requestingLabel : running ? runningLabel : readyLabel,
        onClick: () => void action(),
        disabled: isModelGenerationDisabled(busy, running),
        title: buildModelRequiredTitle(title),
        helpText,
        statusMessage: notice?.message,
        statusTone: notice?.tone,
      };
    };

    const directGenerationButtonConfigs: FocusedTrainingDirectGenerationButtonConfig[] = [
      {
        preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.easy,
        busy: directOpenRouterBusy,
        requestingLabel: 'Requesting easy...',
        runningLabel: 'Generating easy...',
        readyLabel: 'New Easy Session',
        action: generateEasyNextSessionFromOpenRouter,
        title: 'Generate an easy two-minute session with OpenRouter.',
        helpText: 'About 2 minutes. Easy level with simpler vocabulary, shorter clauses, and roughly 300 spoken words.',
      },
      {
        preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressEasy,
        busy: expressEasyOpenRouterBusy,
        requestingLabel: 'Requesting express easy...',
        runningLabel: 'Generating express easy...',
        readyLabel: 'Express Easy Session',
        action: generateExpressEasyNextSessionFromOpenRouter,
        title: 'Generate an easy one-minute express session with OpenRouter.',
        helpText: 'About 1 minute. Easy level, simpler vocabulary, and roughly half the spoken words of the standard easy session.',
      },
      {
        preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium,
        busy: directIntermediateOpenRouterBusy,
        requestingLabel: 'Requesting medium...',
        runningLabel: 'Generating medium...',
        readyLabel: 'New Medium Session',
        action: generateIntermediateNextSessionFromOpenRouter,
        title: 'Generate a medium two-minute session with OpenRouter.',
        helpText: 'About 2 minutes. Medium level with balanced vocabulary, natural phrasing, and roughly 300 spoken words.',
      },
      {
        preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressMedium,
        busy: expressIntermediateOpenRouterBusy,
        requestingLabel: 'Requesting express medium...',
        runningLabel: 'Generating express medium...',
        readyLabel: 'Express Medium Session',
        action: generateExpressIntermediateNextSessionFromOpenRouter,
        title: 'Generate a medium one-minute express session with OpenRouter.',
        helpText: 'About 1 minute. Medium level, balanced phrasing, and roughly half the spoken words of the standard medium session.',
      },
      {
        preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.hard,
        busy: directAdvancedOpenRouterBusy,
        requestingLabel: 'Requesting hard...',
        runningLabel: 'Generating hard...',
        readyLabel: 'New Hard Session',
        action: generateAdvancedNextSessionFromOpenRouter,
        title: 'Generate a hard two-minute session with OpenRouter.',
        helpText: 'About 2 minutes. Hard level with denser vocabulary, more complex grammar, and roughly 300 spoken words.',
      },
      {
        preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressHard,
        busy: expressAdvancedOpenRouterBusy,
        requestingLabel: 'Requesting express hard...',
        runningLabel: 'Generating express hard...',
        readyLabel: 'Express Hard Session',
        action: generateExpressAdvancedNextSessionFromOpenRouter,
        title: 'Generate a hard one-minute express session with OpenRouter.',
        helpText: 'About 1 minute. Hard level, denser vocabulary, and roughly half the spoken words of the standard hard session.',
      },
    ];

    const buttons: TrainingGenerationButton[] = [
      ...directGenerationButtonConfigs.map(buildDirectGenerationButton),
    ];
    if (allowCustomSessionGeneration) {
      buttons.push({
        id: 'custom',
        label: 'New Custom Session',
        onClick: openOpenRouterGenerateForActiveInput,
        disabled: !isOnline || !activeSession || sessionQuotaStatus.blocked,
        title: sessionQuotaStatus.blocked
          ? sessionQuotaStatus.message
          : openRouterOfflineTitle || 'Open the existing OpenRouter custom generation workspace.',
      });
    }
    return buttons;
  }, [
    allowCustomSessionGeneration,
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
