import {
  extractOpenRouterJobText,
  isOpenRouterJobCanceledError,
  type ActiveOpenRouterJob,
  type OpenRouterJobResponse,
} from '../core/openRouterJobs';
import {
  stripJsonFence,
  validateGeneratedScriptForTarget,
} from '../components/openrouter/openRouterViewHelpers';
import type { BenchmarkLanguageButton } from '../components/openrouter/types';
import { formatOpenRouterGenerationDisplayLabel } from './openRouterGenerationFailurePolicy';
import type {
  MutableValueRef,
  OpenRouterJobPollingCallbacks,
  TrainingGenerationNoticesSetter,
} from './openRouterJobPollingTypes';
import type { FailTrackedOpenRouterJobOptions } from './openRouterJobPollingFailure';

export type HandleOpenRouterTerminalJobArgs = {
  callbacksRef: MutableValueRef<OpenRouterJobPollingCallbacks>;
  consumedOpenRouterJobIdsRef: MutableValueRef<Set<string>>;
  failTrackedJob: (
    trackedJob: ActiveOpenRouterJob,
    message: string,
    completedAt: string,
    options?: FailTrackedOpenRouterJobOptions,
  ) => void;
  job: OpenRouterJobResponse;
  setTrainingGenerationNotices: TrainingGenerationNoticesSetter;
  trackedJob: ActiveOpenRouterJob;
};

export function getOpenRouterJobCompletedAt(job: OpenRouterJobResponse): string {
  return job.completedAt || job.updatedAt || new Date().toISOString();
}

export function handleOpenRouterTerminalJob({
  callbacksRef,
  consumedOpenRouterJobIdsRef,
  failTrackedJob,
  job,
  setTrainingGenerationNotices,
  trackedJob,
}: HandleOpenRouterTerminalJobArgs): void {
  const completedAt = getOpenRouterJobCompletedAt(job);

  if (job.status === 'failed') {
    if (isOpenRouterJobCanceledError(job.error)) {
      setTrainingGenerationNotices((current) => ({
        ...current,
        [trackedJob.jobId]: {
          jobId: trackedJob.jobId,
          slotLabel: trackedJob.slotLabel,
          displayLabel: formatOpenRouterGenerationDisplayLabel(trackedJob.slotLabel),
          model: trackedJob.model,
          startedAt: trackedJob.startedAt,
          status: 'canceled',
          completedAt,
          error: job.error,
        },
      }));
      return;
    }
    failTrackedJob(trackedJob, job.error || 'OpenRouter job failed.', completedAt);
    return;
  }

  if (consumedOpenRouterJobIdsRef.current.has(trackedJob.jobId)) return;
  consumedOpenRouterJobIdsRef.current.add(trackedJob.jobId);

  const text = extractOpenRouterJobText(job.result);
  if (!text.trim()) {
    failTrackedJob(trackedJob, 'OpenRouter job finished without usable text.', completedAt);
    return;
  }

  const validation = validateGeneratedScriptForTarget(
    stripJsonFence(text),
    trackedJob.inputMode,
    trackedJob.language as BenchmarkLanguageButton,
  );
  if (validation.ok) {
    callbacksRef.current.onGeneratedScript(validation.script, trackedJob);
    setTrainingGenerationNotices((current) => ({
      ...current,
      [trackedJob.jobId]: {
        jobId: trackedJob.jobId,
        slotLabel: trackedJob.slotLabel,
        displayLabel: formatOpenRouterGenerationDisplayLabel(trackedJob.slotLabel),
        model: trackedJob.model,
        startedAt: trackedJob.startedAt,
        status: 'succeeded',
        completedAt,
      },
    }));
    return;
  }

  const message = validation.errors.join(' ') || 'Generated script did not validate.';
  failTrackedJob(trackedJob, message, completedAt);
}
