import { useMemo } from 'react';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import { buildTrainingGenerationButtonNotice } from '../components/openrouter/openRouterViewHelpers';
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

type FocusedTrainingDirectGenerationButtonDefinition = {
  preset: OpenRouterDirectGenerationPreset;
  requestingLabel: string;
  runningLabel: string;
  readyLabel: string;
  title: string;
  helpText: string;
};

type FocusedTrainingDirectGenerationButtonRuntime = FocusedTrainingDirectGenerationButtonDefinition & {
  busy: boolean;
  action: GenerateSessionAction;
};

type BuildFocusedTrainingGenerationButtonsArgs = Pick<
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
  | 'directIntermediateOpenRouterBusy'
  | 'directAdvancedOpenRouterBusy'
  | 'generateEasyNextSessionFromOpenRouter'
  | 'generateIntermediateNextSessionFromOpenRouter'
  | 'generateAdvancedNextSessionFromOpenRouter'
>;

const DIRECT_GENERATION_BUTTON_DEFINITIONS: FocusedTrainingDirectGenerationButtonDefinition[] = [
  {
    preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.easy,
    requestingLabel: 'Requesting precision...',
    runningLabel: 'Generating precision...',
    readyLabel: 'New Precision Session',
    title: 'Generate a two-minute Precision session with OpenRouter.',
    helpText: 'About 2 minutes. Precision level with simpler vocabulary, shorter clauses, and roughly 300 spoken words.',
  },
  {
    preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium,
    requestingLabel: 'Requesting stabilize...',
    runningLabel: 'Generating stabilize...',
    readyLabel: 'New Stabilize Session',
    title: 'Generate a two-minute Stabilize session with OpenRouter.',
    helpText: 'About 2 minutes. Stabilize level with balanced vocabulary, natural phrasing, and roughly 300 spoken words.',
  },
  {
    preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.hard,
    requestingLabel: 'Requesting challenge...',
    runningLabel: 'Generating challenge...',
    readyLabel: 'New Challenge Session',
    title: 'Generate a two-minute Challenge session with OpenRouter.',
    helpText: 'About 2 minutes. Challenge level with denser vocabulary, more complex grammar, and roughly 300 spoken words.',
  },
];

function hasOpenRouterModel(modelId: string): boolean {
  return Boolean(modelId.trim());
}

function isGenerationRunning(activeJobs: ActiveOpenRouterJob[], slotLabel: string): boolean {
  return activeJobs.some((job) => job.slotLabel === slotLabel);
}

function buildModelRequiredTitle({
  fallbackTitle,
  modelIsSet,
  openRouterOfflineTitle,
  sessionQuotaStatus,
}: {
  fallbackTitle: string;
  modelIsSet: boolean;
  openRouterOfflineTitle: string;
  sessionQuotaStatus: SessionQuotaStatusForGenerationButtons;
}): string {
  if (sessionQuotaStatus.blocked) return sessionQuotaStatus.message;
  return openRouterOfflineTitle || (modelIsSet ? fallbackTitle : 'Set a default OpenRouter model first.');
}

function isModelGenerationDisabled({
  busy,
  running,
  isOnline,
  modelIsSet,
  sessionQuotaStatus,
}: {
  busy: boolean;
  running: boolean;
  isOnline: boolean;
  modelIsSet: boolean;
  sessionQuotaStatus: SessionQuotaStatusForGenerationButtons;
}): boolean {
  return !isOnline || busy || running || !modelIsSet || sessionQuotaStatus.blocked;
}

function buildDirectGenerationButton(
  config: FocusedTrainingDirectGenerationButtonRuntime,
  context: Pick<
    BuildFocusedTrainingGenerationButtonsArgs,
    | 'isOnline'
    | 'sessionQuotaStatus'
    | 'openRouterOfflineTitle'
    | 'activeOpenRouterJobs'
    | 'openRouterJobNotifications'
    | 'trainingGenerationNotices'
    | 'trainingGenerationNowMs'
  > & { modelIsSet: boolean },
): TrainingGenerationButton {
  const running = isGenerationRunning(context.activeOpenRouterJobs, config.preset.slotLabel);
  const notice = buildTrainingGenerationButtonNotice({
    slotLabel: config.preset.slotLabel,
    displayLabel: config.preset.displayLabel,
    notices: context.trainingGenerationNotices,
    jobNotifications: context.openRouterJobNotifications,
    activeJobs: context.activeOpenRouterJobs,
    nowMs: context.trainingGenerationNowMs,
  });

  return {
    id: config.preset.id,
    label: config.busy ? config.requestingLabel : running ? config.runningLabel : config.readyLabel,
    onClick: () => void config.action(),
    disabled: isModelGenerationDisabled({
      busy: config.busy,
      running,
      isOnline: context.isOnline,
      modelIsSet: context.modelIsSet,
      sessionQuotaStatus: context.sessionQuotaStatus,
    }),
    title: buildModelRequiredTitle({
      fallbackTitle: config.title,
      modelIsSet: context.modelIsSet,
      openRouterOfflineTitle: context.openRouterOfflineTitle,
      sessionQuotaStatus: context.sessionQuotaStatus,
    }),
    helpText: config.helpText,
    statusMessage: notice?.message,
    statusTone: notice?.tone,
  };
}

function buildDirectGenerationButtonRuntimes({
  directOpenRouterBusy,
  directIntermediateOpenRouterBusy,
  directAdvancedOpenRouterBusy,
  generateEasyNextSessionFromOpenRouter,
  generateIntermediateNextSessionFromOpenRouter,
  generateAdvancedNextSessionFromOpenRouter,
}: BuildFocusedTrainingGenerationButtonsArgs): FocusedTrainingDirectGenerationButtonRuntime[] {
  const runtimes = [
    { busy: directOpenRouterBusy, action: generateEasyNextSessionFromOpenRouter },
    { busy: directIntermediateOpenRouterBusy, action: generateIntermediateNextSessionFromOpenRouter },
    { busy: directAdvancedOpenRouterBusy, action: generateAdvancedNextSessionFromOpenRouter },
  ];

  return DIRECT_GENERATION_BUTTON_DEFINITIONS.map((definition, index) => ({
    ...definition,
    ...runtimes[index],
  }));
}

function buildFocusedTrainingGenerationButtons(args: BuildFocusedTrainingGenerationButtonsArgs): TrainingGenerationButton[] {
  const modelIsSet = hasOpenRouterModel(args.effectiveOpenRouterDefaultModel);
  return buildDirectGenerationButtonRuntimes(args).map((config) =>
    buildDirectGenerationButton(config, {
      ...args,
      modelIsSet,
    }),
  );
}

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
      directIntermediateOpenRouterBusy,
      directAdvancedOpenRouterBusy,
      generateEasyNextSessionFromOpenRouter,
      generateIntermediateNextSessionFromOpenRouter,
      generateAdvancedNextSessionFromOpenRouter,
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
    directIntermediateOpenRouterBusy,
    directAdvancedOpenRouterBusy,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
  ]);
}
