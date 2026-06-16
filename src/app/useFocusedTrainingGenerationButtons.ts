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
  generateEasyNextSessionFromOpenRouter: GenerateSessionAction;
  generateIntermediateNextSessionFromOpenRouter: GenerateSessionAction;
  generateAdvancedNextSessionFromOpenRouter: GenerateSessionAction;
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
  generateEasyNextSessionFromOpenRouter,
  generateIntermediateNextSessionFromOpenRouter,
  generateAdvancedNextSessionFromOpenRouter,
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
      !isOnline || busy || running || !openRouterModelIsSet || sessionQuotaStatus.blocked;

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
        requestingLabel: 'Requesting precision...',
        runningLabel: 'Generating precision...',
        readyLabel: 'New Precision Session',
        action: generateEasyNextSessionFromOpenRouter,
        title: 'Generate a two-minute Precision session with OpenRouter.',
        helpText: 'About 2 minutes. Precision level with simpler vocabulary, shorter clauses, and roughly 300 spoken words.',
      },
      {
        preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium,
        busy: directIntermediateOpenRouterBusy,
        requestingLabel: 'Requesting stabilize...',
        runningLabel: 'Generating stabilize...',
        readyLabel: 'New Stabilize Session',
        action: generateIntermediateNextSessionFromOpenRouter,
        title: 'Generate a two-minute Stabilize session with OpenRouter.',
        helpText: 'About 2 minutes. Stabilize level with balanced vocabulary, natural phrasing, and roughly 300 spoken words.',
      },
      {
        preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.hard,
        busy: directAdvancedOpenRouterBusy,
        requestingLabel: 'Requesting challenge...',
        runningLabel: 'Generating challenge...',
        readyLabel: 'New Challenge Session',
        action: generateAdvancedNextSessionFromOpenRouter,
        title: 'Generate a two-minute Challenge session with OpenRouter.',
        helpText: 'About 2 minutes. Challenge level with denser vocabulary, more complex grammar, and roughly 300 spoken words.',
      },
    ];

    return directGenerationButtonConfigs.map(buildDirectGenerationButton);
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
    directIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
  ]);
}
