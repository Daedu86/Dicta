import { buildTrainingGenerationButtonNotice } from '../components/openrouter/openRouterViewHelpers';
import type { TrainingGenerationButton } from '../components/training/TrainingGenerationCard';
import {
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from './openRouterDirectGenerationPresets';
import type {
  BuildFocusedTrainingGenerationButtonsArgs,
  SessionQuotaStatusForGenerationButtons,
} from './useFocusedTrainingGenerationButtons';

const MAX_ACTIVE_OPEN_ROUTER_JOBS = 3;

type FocusedTrainingDirectGenerationButtonDefinition = {
  buttonId: string;
  preset: OpenRouterDirectGenerationPreset;
  requestingLabel: string;
  readyLabel: string;
  title: string;
  helpText: string;
};

type FocusedTrainingDirectGenerationButtonRuntime = FocusedTrainingDirectGenerationButtonDefinition & {
  busy: boolean;
  action: () => void | Promise<void>;
};

type DirectGenerationButtonContext = Pick<
  BuildFocusedTrainingGenerationButtonsArgs,
  | 'isOnline'
  | 'sessionQuotaStatus'
  | 'openRouterOfflineTitle'
  | 'activeOpenRouterJobs'
  | 'openRouterJobNotifications'
  | 'trainingGenerationNotices'
  | 'trainingGenerationNowMs'
> & { modelIsSet: boolean };

const ADAPTIVE_GENERATION_BUTTON_DEFINITION: FocusedTrainingDirectGenerationButtonDefinition = {
  buttonId: 'adaptive',
  preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive,
  requestingLabel: 'Requesting session...',
  readyLabel: 'Generate Session',
  title: 'Generate a two-minute adaptive session with OpenRouter.',
  helpText: 'About 2 minutes. The benchmark and latest feedback resolve whether the next session should recover, stabilize, progress, or challenge.',
};

const TOPIC_GENERATION_BUTTON_DEFINITION: FocusedTrainingDirectGenerationButtonDefinition = {
  buttonId: 'topic',
  preset: OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive,
  requestingLabel: 'Requesting topic session...',
  readyLabel: 'Generate Topic Session',
  title: 'Generate a two-minute adaptive session around a topic you provide.',
  helpText: 'Adds your topic to the LLM prompt while the benchmark still controls difficulty, phrase length, and pacing.',
};

export function buildFocusedTrainingGenerationButtons(
  args: BuildFocusedTrainingGenerationButtonsArgs,
): TrainingGenerationButton[] {
  const modelIsSet = hasOpenRouterModel(args.effectiveOpenRouterDefaultModel);
  const context = { ...args, modelIsSet };

  return [
    buildDirectGenerationButton({
      ...ADAPTIVE_GENERATION_BUTTON_DEFINITION,
      busy: args.directOpenRouterBusy,
      action: args.generateAdaptiveNextSessionFromOpenRouter,
    }, context),
    buildDirectGenerationButton({
      ...TOPIC_GENERATION_BUTTON_DEFINITION,
      busy: args.directOpenRouterBusy,
      action: args.generateTopicNextSessionFromOpenRouter,
    }, context),
  ];
}

function hasOpenRouterModel(modelId: string): boolean {
  return Boolean(modelId.trim());
}

function buildDirectGenerationButton(
  config: FocusedTrainingDirectGenerationButtonRuntime,
  context: DirectGenerationButtonContext,
): TrainingGenerationButton {
  const activeJobCount = context.activeOpenRouterJobs.length;
  const atActiveJobLimit = activeJobCount >= MAX_ACTIVE_OPEN_ROUTER_JOBS;
  const notice = buildTrainingGenerationButtonNotice({
    slotLabel: config.preset.slotLabel,
    displayLabel: config.preset.displayLabel,
    notices: context.trainingGenerationNotices,
    jobNotifications: context.openRouterJobNotifications,
    activeJobs: context.activeOpenRouterJobs,
    nowMs: context.trainingGenerationNowMs,
  });

  return {
    id: config.buttonId,
    label: buildGenerationButtonLabel(config, activeJobCount, atActiveJobLimit),
    onClick: () => void config.action(),
    disabled: isModelGenerationDisabled({ ...context, busy: config.busy, atActiveJobLimit }),
    title: buildModelRequiredTitle({
      fallbackTitle: atActiveJobLimit ? `Generation limit ${MAX_ACTIVE_OPEN_ROUTER_JOBS}/${MAX_ACTIVE_OPEN_ROUTER_JOBS}.` : config.title,
      modelIsSet: context.modelIsSet,
      openRouterOfflineTitle: context.openRouterOfflineTitle,
      sessionQuotaStatus: context.sessionQuotaStatus,
    }),
    helpText: config.helpText,
    statusMessage: notice?.message,
    statusTone: notice?.tone,
  };
}

function buildGenerationButtonLabel(
  config: FocusedTrainingDirectGenerationButtonRuntime,
  activeJobCount: number,
  atActiveJobLimit: boolean,
): string {
  if (config.busy) return config.requestingLabel;
  if (atActiveJobLimit) return `Generating sessions (${activeJobCount}/${MAX_ACTIVE_OPEN_ROUTER_JOBS})`;
  if (activeJobCount > 0) return `${config.readyLabel} (${activeJobCount}/${MAX_ACTIVE_OPEN_ROUTER_JOBS})`;
  return config.readyLabel;
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
  atActiveJobLimit,
  isOnline,
  modelIsSet,
  sessionQuotaStatus,
}: DirectGenerationButtonContext & { busy: boolean; atActiveJobLimit: boolean }): boolean {
  return !isOnline || busy || atActiveJobLimit || !modelIsSet || sessionQuotaStatus.blocked;
}
