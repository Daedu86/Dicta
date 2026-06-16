import type { ActiveOpenRouterJob } from '../../core/openRouterJobs';
import type { BuildWorkspaceActiveOpenRouterJobArgs } from './useOpenRouterWorkspaceSlotGenerationTypes';

export function buildWorkspaceActiveOpenRouterJob({
  jobId,
  slotId,
  slotLabel,
  slotModel,
  generationStartedAt,
  promptSize,
  generateInputMode,
  generateLanguage,
  generateDurationMinutes,
}: BuildWorkspaceActiveOpenRouterJobArgs): ActiveOpenRouterJob {
  return {
    jobId,
    model: slotModel,
    slotLabel,
    inputMode: generateInputMode,
    language: generateLanguage,
    durationMinutes: generateDurationMinutes,
    promptMode: promptSize.promptMode,
    promptCharacterCount: promptSize.characterCount,
    promptApproximateTokenCount: promptSize.approximateTokenCount,
    origin: 'custom-workspace',
    customSlotId: slotId,
    startedAt: generationStartedAt,
  };
}
