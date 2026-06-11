import { randomUUID } from 'node:crypto';

export type LocalOpenRouterJobRequest = {
  model: string;
  prompt: string;
  maxTokens: number;
  inputMode?: string;
  language?: string;
  slotLabel?: string;
  durationMinutes?: number;
  targetDifficulty?: string;
};

export type LocalOpenRouterJobResult = {
  text: string;
  payload: { choices?: Array<{ message?: { content?: string } }> };
  model: string;
};

export type LocalOpenRouterJob = {
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  request: LocalOpenRouterJobRequest;
  result: LocalOpenRouterJobResult | null;
  error: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

const localOpenRouterJobs = new Map<string, LocalOpenRouterJob>();

const isActiveLocalOpenRouterJob = (job: LocalOpenRouterJob): boolean =>
  job.status === 'queued' || job.status === 'running';

export const getLocalOpenRouterJob = (jobId: string): LocalOpenRouterJob | undefined =>
  localOpenRouterJobs.get(jobId);

export const countActiveLocalOpenRouterJobs = (): number =>
  [...localOpenRouterJobs.values()].filter(isActiveLocalOpenRouterJob).length;

export const createQueuedLocalOpenRouterJob = (
  request: LocalOpenRouterJobRequest,
  createdAt = new Date().toISOString(),
): LocalOpenRouterJob => {
  const jobId = randomUUID();
  const job: LocalOpenRouterJob = {
    jobId,
    status: 'queued',
    request,
    result: null,
    error: '',
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
  };
  localOpenRouterJobs.set(jobId, job);
  return job;
};

export const markLocalOpenRouterJobRunning = (
  job: LocalOpenRouterJob,
  updatedAt = new Date().toISOString(),
): void => {
  localOpenRouterJobs.set(job.jobId, { ...job, status: 'running', updatedAt });
};

export const markLocalOpenRouterJobSucceeded = (
  job: LocalOpenRouterJob,
  result: LocalOpenRouterJobResult,
  completedAt = new Date().toISOString(),
): void => {
  localOpenRouterJobs.set(job.jobId, {
    ...job,
    status: 'succeeded',
    result,
    updatedAt: completedAt,
    completedAt,
  });
};

export const markLocalOpenRouterJobFailed = (
  job: LocalOpenRouterJob,
  error: unknown,
  completedAt = new Date().toISOString(),
): void => {
  localOpenRouterJobs.set(job.jobId, {
    ...job,
    status: 'failed',
    error: error instanceof Error ? error.message : 'OpenRouter job failed.',
    updatedAt: completedAt,
    completedAt,
  });
};
