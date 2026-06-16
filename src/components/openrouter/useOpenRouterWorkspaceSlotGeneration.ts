import {
  estimateOpenRouterPromptSize,
  getOpenRouterGenerationMaxTokens,
} from '../../core/adaptive/openRouterGenerationPrompt';
import { isTransientOpenRouterGenerationError } from '../../core/adaptive/openRouterFallbackScript';
import type { OpenRouterJobResponse } from '../../core/openRouterJobs';
import { requestTrainingNotificationPermission } from '../../core/trainingNotifications';
import {
  formatInterruptedOpenRouterMessage,
  getOpenRouterSlotLabel,
  parseTimestampMs,
  releaseOpenRouterWakeLock,
  requestOpenRouterWakeLock,
  shouldCreatePersistentGenerationErrorSession,
} from './openRouterViewHelpers';
import { buildOpenRouterWorkspaceVariantPrompt } from './openRouterWorkspaceRuntimeHelpers';
import { buildWorkspaceActiveOpenRouterJob } from './openRouterWorkspaceSlotGenerationJob';
import type { UseOpenRouterWorkspaceSlotGenerationArgs } from './useOpenRouterWorkspaceSlotGenerationTypes';
import type { OpenRouterGenerationSlotId } from './types';

export type { UseOpenRouterWorkspaceSlotGenerationArgs } from './useOpenRouterWorkspaceSlotGenerationTypes';

function formatOpenRouterWorkspaceGenerationError(err: unknown): string {
  if (err instanceof TypeError) {
    return 'Failed to reach OpenRouter endpoint. Refresh the page and try a free model such as openrouter/free.';
  }
  return err instanceof Error ? err.message : 'OpenRouter generation failed.';
}

export function useOpenRouterWorkspaceSlotGeneration({
  defaultModel,
  authHeaders,
  activeJobs,
  onTrackJob,
  onCreateGenerationErrorSession,
  generationSlots,
  generateBusySlots,
  setGenerateBusySlots,
  updateGenerationSlot,
  generateInputMode,
  generateLanguage,
  generatePromptSource,
  generateDurationMinutes,
  generatePayloadPrompt,
}: UseOpenRouterWorkspaceSlotGenerationArgs) {
  async function generateOpenRouterSlot(slotId: OpenRouterGenerationSlotId): Promise<void> {
    const slot = generationSlots[slotId];
    const slotModel = defaultModel;
    const slotLabel = getOpenRouterSlotLabel(slotId);
    const existingJob = activeJobs.some((job) => job.origin === 'custom-workspace' && job.customSlotId === slotId);
    if (existingJob || generateBusySlots[slotId]) return;

    if (!slotModel) {
      const message = `Set a model for ${slotLabel} first.`;
      updateGenerationSlot(slotId, { error: message });
      onCreateGenerationErrorSession({
        slotLabel,
        inputMode: generateInputMode,
        language: generateLanguage,
        message,
      });
      return;
    }

    void requestTrainingNotificationPermission();

    setGenerateBusySlots((current) => ({ ...current, [slotId]: true }));
    updateGenerationSlot(slotId, { error: '' });

    const slotPrompt = buildOpenRouterWorkspaceVariantPrompt(slotId, generatePayloadPrompt, slot, slotModel);
    const slotMaxTokens = getOpenRouterGenerationMaxTokens(generateDurationMinutes);
    const generationStartedAt = new Date().toISOString();
    const promptSize = estimateOpenRouterPromptSize(slotPrompt, {
      promptMode: generatePromptSource,
      durationMinutes: generateDurationMinutes,
      inputMode: generateInputMode,
      language: generateLanguage,
    });
    const wakeLock = await requestOpenRouterWakeLock();

    try {
      const response = await fetch('/api/openrouter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          model: slotModel,
          prompt: slotPrompt,
          maxTokens: slotMaxTokens,
          slotLabel,
          inputMode: generateInputMode,
          language: generateLanguage,
          durationMinutes: generateDurationMinutes,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Generation request failed (${response.status}).`);
      }

      const payload = (await response.json()) as OpenRouterJobResponse;
      const jobId = payload.jobId;
      if (!jobId) throw new Error('OpenRouter job did not return an id.');

      onTrackJob(
        buildWorkspaceActiveOpenRouterJob({
          jobId,
          slotId,
          slotLabel,
          slotModel,
          generationStartedAt,
          promptSize,
          generateInputMode,
          generateLanguage,
          generateDurationMinutes,
        }),
      );
      updateGenerationSlot(slotId, {
        inputMode: generateInputMode,
        language: generateLanguage,
        generatedAt: generationStartedAt,
        model: slotModel,
        error: '',
      });
    } catch (err) {
      const message = formatOpenRouterWorkspaceGenerationError(err);
      if (isTransientOpenRouterGenerationError(message)) {
        const nowMs = Date.now();
        updateGenerationSlot(slotId, {
          inputMode: generateInputMode,
          language: generateLanguage,
          generatedAt: new Date().toISOString(),
          model: slotModel,
          error: formatInterruptedOpenRouterMessage(
            slotLabel,
            slotModel,
            Math.max(0, nowMs - parseTimestampMs(generationStartedAt, nowMs)),
          ),
        });
        return;
      }

      updateGenerationSlot(slotId, {
        inputMode: generateInputMode,
        language: generateLanguage,
        generatedAt: new Date().toISOString(),
        model: slotModel,
        error: message,
      });
      if (shouldCreatePersistentGenerationErrorSession(message)) {
        onCreateGenerationErrorSession({
          slotLabel,
          inputMode: generateInputMode,
          language: generateLanguage,
          message,
        });
      }
    } finally {
      await releaseOpenRouterWakeLock(wakeLock);
      setGenerateBusySlots((current) => ({ ...current, [slotId]: false }));
    }
  }

  return { generateOpenRouterSlot };
}
