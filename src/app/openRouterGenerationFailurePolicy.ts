import { isTransientOpenRouterGenerationError } from '../core/adaptive/openRouterFallbackScript';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import {
  formatOpenRouterSlotDisplayLabel,
  formatInterruptedOpenRouterMessage,
  parseTimestampMs,
  shouldCreatePersistentGenerationErrorSession,
} from '../components/openrouter/openRouterViewHelpers';
import type { TrainingGenerationNotice } from '../components/openrouter/types';

export type OpenRouterGenerationFailureRecord = {
  slotLabel: string;
  displayLabel: string;
  model: string;
  startedAt: string;
  error: string;
  completedAt?: string;
};

type OpenRouterGenerationFailureNoticeArgs = {
  slotLabel: string;
  displayLabel?: string;
  model: string;
  startedAt: string;
  completedAt: string;
  error: string;
};

type OpenRouterDirectGenerationFailureArgs = {
  slotLabel: string;
  displayLabel: string;
  model: string;
  startedAt: string;
  message: string;
  nowMs?: number;
};

export type OpenRouterDirectGenerationFailureResolution = {
  notice: OpenRouterGenerationFailureRecord;
  openRouterErrorMessage: string | null;
  createPersistentErrorSession: boolean;
};

export function formatOpenRouterGenerationDisplayLabel(slotLabel: string): string {
  return formatOpenRouterSlotDisplayLabel(slotLabel);
}

export function buildOpenRouterGenerationFailureNotice({
  slotLabel,
  displayLabel = formatOpenRouterGenerationDisplayLabel(slotLabel),
  model,
  startedAt,
  completedAt,
  error,
}: OpenRouterGenerationFailureNoticeArgs): TrainingGenerationNotice {
  return {
    slotLabel,
    displayLabel,
    model,
    startedAt,
    status: 'failed',
    completedAt,
    error,
  };
}

export function buildTrackedOpenRouterGenerationFailureNotice(
  trackedJob: ActiveOpenRouterJob,
  message: string,
  completedAt: string,
): TrainingGenerationNotice {
  return buildOpenRouterGenerationFailureNotice({
    slotLabel: trackedJob.slotLabel,
    model: trackedJob.model,
    startedAt: trackedJob.startedAt,
    completedAt,
    error: message,
  });
}

export function resolveOpenRouterDirectGenerationFailure({
  slotLabel,
  displayLabel,
  model,
  startedAt,
  message,
  nowMs = Date.now(),
}: OpenRouterDirectGenerationFailureArgs): OpenRouterDirectGenerationFailureResolution {
  const notice: OpenRouterGenerationFailureRecord = {
    slotLabel,
    displayLabel,
    model,
    startedAt,
    error: message,
  };

  if (isTransientOpenRouterGenerationError(message)) {
    return {
      notice,
      openRouterErrorMessage: formatInterruptedOpenRouterMessage(
        slotLabel,
        model,
        Math.max(0, nowMs - parseTimestampMs(startedAt, nowMs)),
      ),
      createPersistentErrorSession: false,
    };
  }

  if (shouldCreatePersistentGenerationErrorSession(message)) {
    return {
      notice,
      openRouterErrorMessage: null,
      createPersistentErrorSession: true,
    };
  }

  return {
    notice,
    openRouterErrorMessage: message,
    createPersistentErrorSession: false,
  };
}
