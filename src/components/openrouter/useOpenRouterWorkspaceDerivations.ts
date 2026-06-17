import { useMemo } from 'react';
import type { InputMode } from '../../core/adaptive/types';
import {
  type OpenRouterGeneratePromptSource,
} from '../../core/adaptive/openRouterGenerationPrompt';
import { isSupportedLanguage } from '../../core/languages';
import { buildOpenRouterModelOptions } from './openRouterViewHelpers';
import {
  OPEN_ROUTER_GENERATE_DURATION_OPTIONS,
  OPEN_ROUTER_GENERATE_PROMPT_SOURCE_OPTIONS,
  OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS,
  OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS,
  buildOpenRouterWorkspaceExportPayloads,
} from './openRouterWorkspaceRuntimeHelpers';
import type {
  BenchmarkLanguageButton,
  OpenRouterGenerationSlotId,
  OpenRouterGenerationSlots,
  OpenRouterModelSummary,
  OpenRouterWorkspaceProps,
} from './types';
import type { ActiveOpenRouterJob } from '../../core/openRouterJobs';
import { LOCAL_DEV_FEATURES_AVAILABLE } from './openRouterWorkspaceRuntimeConfig';
import { useOpenRouterGeneratePromptDerivations } from './useOpenRouterGeneratePromptDerivations';
import { useOpenRouterGenerateSlotDerivations } from './useOpenRouterGenerateSlotDerivations';

type UseOpenRouterWorkspaceDerivationsArgs = Pick<
  OpenRouterWorkspaceProps,
  | 'assignedModel'
  | 'exportActiveSessionStatus'
  | 'exportProfile'
  | 'exportSessionFeedback'
  | 'benchmarks'
  | 'sessionFeedbackByInputLanguage'
  | 'jobNotifications'
  | 'generationNowMs'
> & {
  defaultModel: string;
  models: OpenRouterModelSummary[];
  activeJobs: ActiveOpenRouterJob[];
  generationSlots: OpenRouterGenerationSlots;
  generateBusySlots: Record<OpenRouterGenerationSlotId, boolean>;
  humanFeedbackDraft: string;
  generateInputMode: InputMode;
  generateLanguage: BenchmarkLanguageButton;
  generatePromptSource: OpenRouterGeneratePromptSource;
  generateDurationMinutes: 2 | 3 | 4;
  activeGenerateSlotId: OpenRouterGenerationSlotId;
};

export function useOpenRouterWorkspaceDerivations({
  defaultModel,
  assignedModel,
  models,
  exportActiveSessionStatus,
  exportProfile,
  exportSessionFeedback,
  benchmarks,
  sessionFeedbackByInputLanguage,
  activeJobs,
  jobNotifications,
  generationNowMs,
  generationSlots,
  generateBusySlots,
  humanFeedbackDraft,
  generateInputMode,
  generateLanguage,
  generatePromptSource,
  generateDurationMinutes,
  activeGenerateSlotId,
}: UseOpenRouterWorkspaceDerivationsArgs) {
  const modelSelectionLocked = Boolean(assignedModel);
  const modelOptions = useMemo(
    () => buildOpenRouterModelOptions(models, [defaultModel, assignedModel]),
    [assignedModel, defaultModel, models],
  );

  const exportPayloads = useMemo(
    () =>
      buildOpenRouterWorkspaceExportPayloads({
        exportActiveSessionStatus,
        exportProfile,
        exportSessionFeedback,
        humanFeedbackDraft,
      }),
    [exportActiveSessionStatus, exportProfile, exportSessionFeedback, humanFeedbackDraft],
  );

  const {
    generatePayloads,
    generateHasBenchmarkData,
    generateHasSessionFeedback,
  } = useOpenRouterGeneratePromptDerivations({
    benchmarks,
    sessionFeedbackByInputLanguage,
    generateInputMode,
    generateLanguage,
    generatePromptSource,
    generateDurationMinutes,
  });

  const activeGenerateSlotModel = defaultModel;
  const {
    activeGenerateSlot,
    activeGenerateSlotPrompt,
    activeGenerateSlotValidation,
    activeGenerateSlotJob,
    activeGenerateSlotJobNotice,
    activeGenerateSlotBusy,
  } = useOpenRouterGenerateSlotDerivations({
    activeJobs,
    jobNotifications,
    generationNowMs,
    generationSlots,
    generateBusySlots,
    activeGenerateSlotId,
    activeGenerateSlotModel,
    generatePrompt: generatePayloads.prompt,
  });

  const exportHasBenchmarkData = exportProfile.sampleCount > 0 || exportProfile.sessionCount > 0;
  const exportHasSessionFeedback = Boolean(exportSessionFeedback);
  const exportLanguage: BenchmarkLanguageButton = isSupportedLanguage(exportProfile.language) ? exportProfile.language : 'en';
  const profileInputModeOptions = OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS;
  const generateInputModeOptions = LOCAL_DEV_FEATURES_AVAILABLE
    ? profileInputModeOptions
    : profileInputModeOptions.filter((option) => option.value === 'browser-tts');

  return {
    modelSelectionLocked,
    modelOptions,
    exportPayloads,
    generatePayloads,
    generateHasBenchmarkData,
    generateHasSessionFeedback,
    activeGenerateSlot,
    activeGenerateSlotModel,
    activeGenerateSlotPrompt,
    activeGenerateSlotValidation,
    activeGenerateSlotJob,
    activeGenerateSlotJobNotice,
    activeGenerateSlotBusy,
    exportHasBenchmarkData,
    exportHasSessionFeedback,
    exportLanguage,
    profileInputModeOptions,
    generateInputModeOptions,
    profileLanguageOptions: OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS,
    generatePromptSourceOptions: OPEN_ROUTER_GENERATE_PROMPT_SOURCE_OPTIONS,
    generateDurationOptions: OPEN_ROUTER_GENERATE_DURATION_OPTIONS,
  };
}
