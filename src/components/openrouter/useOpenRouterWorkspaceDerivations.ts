import { useMemo } from 'react';
import type { InputMode } from '../../core/adaptive/types';
import { createEmptyInputLanguageBenchmark } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  buildOpenRouterGenerationPrompt,
  type OpenRouterGeneratePromptSource,
} from '../../core/adaptive/openRouterGenerationPrompt';
import type { DictationScriptValidationResult } from '../../core/adaptive/dictationScriptValidation';
import { selectLatestAdaptiveSessionFeedback } from '../../core/adaptive/sessionFeedback';
import { isSupportedLanguage } from '../../core/languages';
import {
  buildOpenRouterModelOptions,
  formatTrainingGenerationNotice,
  getOpenRouterSlotLabel,
  parseTimestampMs,
  validateGeneratedScriptForTarget,
} from './openRouterViewHelpers';
import {
  OPEN_ROUTER_GENERATE_DURATION_OPTIONS,
  OPEN_ROUTER_GENERATE_PROMPT_SOURCE_OPTIONS,
  OPEN_ROUTER_PROFILE_INPUT_MODE_OPTIONS,
  OPEN_ROUTER_PROFILE_LANGUAGE_OPTIONS,
  buildOpenRouterWorkspaceExportPayloads,
  buildOpenRouterWorkspaceVariantPrompt,
} from './openRouterWorkspaceRuntimeHelpers';
import type {
  BenchmarkLanguageButton,
  OpenRouterGenerationSlotId,
  OpenRouterGenerationSlots,
  OpenRouterModelSummary,
  OpenRouterWorkspaceProps,
  TrainingGenerationNoticeView,
} from './types';
import type { ActiveOpenRouterJob } from '../../core/openRouterJobs';
import { LOCAL_DEV_FEATURES_AVAILABLE } from './openRouterWorkspaceRuntimeConfig';

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

  const generateProfile =
    benchmarks[generateInputMode]?.[generateLanguage] ?? createEmptyInputLanguageBenchmark(generateInputMode, generateLanguage);
  const generateSessionFeedback = selectLatestAdaptiveSessionFeedback(
    sessionFeedbackByInputLanguage[generateInputMode]?.[generateLanguage],
    generateInputMode,
    generateLanguage,
  );
  const generateHasBenchmarkData = generateProfile.sampleCount > 0 || generateProfile.sessionCount > 0;
  const generateHasSessionFeedback = Boolean(generateSessionFeedback);
  const generatePayloads = useMemo(
    () =>
      buildOpenRouterGenerationPrompt({
        profile: generateProfile,
        sessionFeedback: generateSessionFeedback,
        promptSource: generatePromptSource,
        durationMinutes: generateDurationMinutes,
        userIntent: 'auto',
      }),
    [generateDurationMinutes, generateProfile, generatePromptSource, generateSessionFeedback],
  );

  const activeGenerateSlot = generationSlots[activeGenerateSlotId];
  const activeGenerateSlotModel = defaultModel;
  const activeGenerateSlotPrompt = useMemo(
    () => buildOpenRouterWorkspaceVariantPrompt(activeGenerateSlotId, generatePayloads.prompt, activeGenerateSlot, activeGenerateSlotModel),
    [activeGenerateSlotId, activeGenerateSlot, activeGenerateSlotModel, generatePayloads.prompt],
  );
  const activeGenerateSlotValidation = useMemo<DictationScriptValidationResult | null>(() => {
    if (!activeGenerateSlot.json || !activeGenerateSlot.inputMode || !activeGenerateSlot.language) return null;
    return validateGeneratedScriptForTarget(activeGenerateSlot.json, activeGenerateSlot.inputMode, activeGenerateSlot.language);
  }, [activeGenerateSlot.inputMode, activeGenerateSlot.json, activeGenerateSlot.language]);

  const activeGenerateSlotJob = useMemo(
    () =>
      [...activeJobs]
        .filter((job) => job.origin === 'custom-workspace' && job.customSlotId === activeGenerateSlotId)
        .sort((a, b) => parseTimestampMs(b.startedAt, generationNowMs) - parseTimestampMs(a.startedAt, generationNowMs))[0] ?? null,
    [activeGenerateSlotId, activeJobs, generationNowMs],
  );
  const activeGenerateSlotJobNotice = useMemo<TrainingGenerationNoticeView | null>(() => {
    if (activeGenerateSlotJob) {
      return formatTrainingGenerationNotice(
        {
          slotLabel: activeGenerateSlotJob.slotLabel,
          displayLabel: activeGenerateSlotJob.slotLabel,
          model: activeGenerateSlotJob.model,
          startedAt: activeGenerateSlotJob.startedAt,
          status: 'running',
        },
        generationNowMs,
      );
    }

    const latestNotification =
      Object.values(jobNotifications)
        .filter((notification) => notification.slotLabel === getOpenRouterSlotLabel(activeGenerateSlotId))
        .sort((a, b) => parseTimestampMs(b.startedAt, generationNowMs) - parseTimestampMs(a.startedAt, generationNowMs))[0] ?? null;
    if (!latestNotification) return null;

    return formatTrainingGenerationNotice(
      {
        slotLabel: latestNotification.slotLabel,
        displayLabel: latestNotification.slotLabel,
        model: latestNotification.model,
        startedAt: latestNotification.startedAt,
        status: latestNotification.status,
        completedAt: latestNotification.completedAt,
        error: latestNotification.error,
      },
      generationNowMs,
    );
  }, [activeGenerateSlotId, activeGenerateSlotJob, generationNowMs, jobNotifications]);

  const activeGenerateSlotBusy = generateBusySlots[activeGenerateSlotId] || Boolean(activeGenerateSlotJob);
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
