import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import { buildTrackedOpenRouterGenerationFailureNotice } from './openRouterGenerationFailurePolicy';
import type {
  MutableValueRef,
  OpenRouterJobPollingCallbacks,
  TrainingGenerationNoticesSetter,
} from './openRouterJobPollingTypes';

export type FailTrackedOpenRouterJobOptions = {
  createErrorSession?: boolean;
};

export type FailTrackedOpenRouterJobArgs = {
  callbacksRef: MutableValueRef<OpenRouterJobPollingCallbacks>;
  setTrainingGenerationNotices: TrainingGenerationNoticesSetter;
  trackedJob: ActiveOpenRouterJob;
  message: string;
  completedAt: string;
  options?: FailTrackedOpenRouterJobOptions;
};

export function failTrackedOpenRouterJob({
  callbacksRef,
  setTrainingGenerationNotices,
  trackedJob,
  message,
  completedAt,
  options = {},
}: FailTrackedOpenRouterJobArgs): void {
  callbacksRef.current.onOpenRouterError(message);
  if (options.createErrorSession !== false) {
    callbacksRef.current.onCreateGenerationErrorSession(trackedJob, message);
  }
  setTrainingGenerationNotices((current) => ({
    ...current,
    [trackedJob.slotLabel]: buildTrackedOpenRouterGenerationFailureNotice(trackedJob, message, completedAt),
  }));
}
