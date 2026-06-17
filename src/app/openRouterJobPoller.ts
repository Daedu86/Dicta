import {
  isOpenRouterJobTerminal,
  type ActiveOpenRouterJob,
  type OpenRouterJobResponse,
} from '../core/openRouterJobs';
import {
  buildOpenRouterJobNotification,
} from '../components/openrouter/openRouterViewHelpers';
import type { OpenRouterJobNotification } from '../components/openrouter/types';
import { failTrackedOpenRouterJob } from './openRouterJobPollingFailure';
import { handleOpenRouterTerminalJob } from './openRouterJobPollingCompletion';
import {
  applyOpenRouterJobNotifications,
  removeSettledOpenRouterJobs,
} from './openRouterJobPollingState';
import type {
  ActiveOpenRouterJobsSetter,
  MutableValueRef,
  OpenRouterJobNotificationsSetter,
  OpenRouterJobPollingCallbacks,
  OpenRouterJobStatusSetter,
  TrainingGenerationNoticesSetter,
} from './openRouterJobPollingTypes';

export type PollOpenRouterJobsArgs = {
  activeOpenRouterJobs: ActiveOpenRouterJob[];
  callbacksRef: MutableValueRef<OpenRouterJobPollingCallbacks>;
  consumedOpenRouterJobIdsRef: MutableValueRef<Set<string>>;
  isCancelled: () => boolean;
  setActiveOpenRouterJobs: ActiveOpenRouterJobsSetter;
  setOpenRouterJobNotifications: OpenRouterJobNotificationsSetter;
  setOpenRouterJobStatus: OpenRouterJobStatusSetter;
  setTrainingGenerationNotices: TrainingGenerationNoticesSetter;
};

async function fetchOpenRouterJobStatus(
  trackedJob: ActiveOpenRouterJob,
  callbacksRef: MutableValueRef<OpenRouterJobPollingCallbacks>,
): Promise<OpenRouterJobResponse> {
  const response = await fetch(`/api/openrouter/jobs?id=${encodeURIComponent(trackedJob.jobId)}`, {
    headers: callbacksRef.current.getAuthHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `OpenRouter job status failed (${response.status}).`);
  }
  return (await response.json()) as OpenRouterJobResponse;
}

export async function pollOpenRouterJobs({
  activeOpenRouterJobs,
  callbacksRef,
  consumedOpenRouterJobIdsRef,
  isCancelled,
  setActiveOpenRouterJobs,
  setOpenRouterJobNotifications,
  setOpenRouterJobStatus,
  setTrainingGenerationNotices,
}: PollOpenRouterJobsArgs): Promise<void> {
  const settledJobIds: string[] = [];
  const notifications: OpenRouterJobNotification[] = [];

  await Promise.all(
    activeOpenRouterJobs.map(async (trackedJob) => {
      const failTrackedJob = (
        failedJob: ActiveOpenRouterJob,
        message: string,
        completedAt: string,
        options?: { createErrorSession?: boolean },
      ) => {
        failTrackedOpenRouterJob({
          callbacksRef,
          setTrainingGenerationNotices,
          trackedJob: failedJob,
          message,
          completedAt,
          options,
        });
      };

      try {
        const job = await fetchOpenRouterJobStatus(trackedJob, callbacksRef);
        if (isCancelled()) return;

        notifications.push(buildOpenRouterJobNotification(trackedJob, job));
        if (!isOpenRouterJobTerminal(job.status)) return;

        settledJobIds.push(trackedJob.jobId);
        handleOpenRouterTerminalJob({
          callbacksRef,
          consumedOpenRouterJobIdsRef,
          failTrackedJob,
          job,
          setTrainingGenerationNotices,
          trackedJob,
        });
      } catch (error) {
        if (isCancelled()) return;
        const message = error instanceof Error ? error.message : 'OpenRouter job polling failed.';
        notifications.push(buildOpenRouterJobNotification(trackedJob, null, message));
        failTrackedJob(trackedJob, message, new Date().toISOString(), { createErrorSession: false });
      }
    }),
  );

  if (isCancelled()) return;
  applyOpenRouterJobNotifications({
    notifications,
    setOpenRouterJobNotifications,
    setOpenRouterJobStatus,
  });
  removeSettledOpenRouterJobs({
    settledJobIds,
    setActiveOpenRouterJobs,
  });
}
