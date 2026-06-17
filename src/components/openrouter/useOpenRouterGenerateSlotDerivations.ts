import { useMemo } from 'react';
import type { DictationScriptValidationResult } from '../../core/adaptive/dictationScriptValidation';
import type { ActiveOpenRouterJob } from '../../core/openRouterJobs';
import {
  formatTrainingGenerationNotice,
  getOpenRouterSlotLabel,
  parseTimestampMs,
  validateGeneratedScriptForTarget,
} from './openRouterViewHelpers';
import { buildOpenRouterWorkspaceVariantPrompt } from './openRouterWorkspaceRuntimeHelpers';
import type {
  OpenRouterGenerationSlotId,
  OpenRouterGenerationSlots,
  OpenRouterWorkspaceProps,
  TrainingGenerationNoticeView,
} from './types';

type UseOpenRouterGenerateSlotDerivationsArgs = Pick<
  OpenRouterWorkspaceProps,
  | 'jobNotifications'
  | 'generationNowMs'
> & {
  activeJobs: ActiveOpenRouterJob[];
  generationSlots: OpenRouterGenerationSlots;
  generateBusySlots: Record<OpenRouterGenerationSlotId, boolean>;
  activeGenerateSlotId: OpenRouterGenerationSlotId;
  activeGenerateSlotModel: string;
  generatePrompt: string;
};

export function useOpenRouterGenerateSlotDerivations({
  activeJobs,
  jobNotifications,
  generationNowMs,
  generationSlots,
  generateBusySlots,
  activeGenerateSlotId,
  activeGenerateSlotModel,
  generatePrompt,
}: UseOpenRouterGenerateSlotDerivationsArgs) {
  const activeGenerateSlot = generationSlots[activeGenerateSlotId];
  const activeGenerateSlotPrompt = useMemo(
    () => buildOpenRouterWorkspaceVariantPrompt(activeGenerateSlotId, generatePrompt, activeGenerateSlot, activeGenerateSlotModel),
    [activeGenerateSlotId, activeGenerateSlot, activeGenerateSlotModel, generatePrompt],
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

  return {
    activeGenerateSlot,
    activeGenerateSlotPrompt,
    activeGenerateSlotValidation,
    activeGenerateSlotJob,
    activeGenerateSlotJobNotice,
    activeGenerateSlotBusy: generateBusySlots[activeGenerateSlotId] || Boolean(activeGenerateSlotJob),
  };
}
