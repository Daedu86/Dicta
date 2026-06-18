import { normalizeActiveOpenRouterJob } from './activeOpenRouterJobNormalization';
import {
  safeGetLocalStorageItem,
  safeRemoveLocalStorageItem,
  safeSetLocalStorageItem,
} from './storage/safeLocalStorage';
import {
  OPENROUTER_ACTIVE_JOB_STORAGE_KEY,
  OPENROUTER_ACTIVE_JOBS_STORAGE_KEY,
  type ActiveOpenRouterJob,
} from './openRouterJobTypes';

export function loadActiveOpenRouterJob(): ActiveOpenRouterJob | null {
  return loadActiveOpenRouterJobs()[0] ?? null;
}

export function loadActiveOpenRouterJobs(): ActiveOpenRouterJob[] {
  if (typeof window === 'undefined') return [];

  try {
    const rawJobs = safeGetLocalStorageItem(OPENROUTER_ACTIVE_JOBS_STORAGE_KEY);
    if (rawJobs) {
      const parsed = JSON.parse(rawJobs);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeActiveOpenRouterJob).filter((job): job is ActiveOpenRouterJob => Boolean(job));
      }
    }

    const legacyJob = normalizeActiveOpenRouterJob(
      JSON.parse(safeGetLocalStorageItem(OPENROUTER_ACTIVE_JOB_STORAGE_KEY) ?? 'null'),
    );
    return legacyJob ? [legacyJob] : [];
  } catch {
    return [];
  }
}

export function persistActiveOpenRouterJob(job: ActiveOpenRouterJob): void {
  persistActiveOpenRouterJobs([job]);
}

export function persistActiveOpenRouterJobs(jobs: ActiveOpenRouterJob[]): void {
  safeSetLocalStorageItem(OPENROUTER_ACTIVE_JOBS_STORAGE_KEY, JSON.stringify(jobs));
  safeRemoveLocalStorageItem(OPENROUTER_ACTIVE_JOB_STORAGE_KEY);
}

export function addActiveOpenRouterJob(
  job: ActiveOpenRouterJob,
  currentJobs: ActiveOpenRouterJob[],
): ActiveOpenRouterJob[] {
  const nextJobs = [...currentJobs.filter((current) => current.jobId !== job.jobId), job];
  persistActiveOpenRouterJobs(nextJobs);
  return nextJobs;
}

export function removeActiveOpenRouterJob(
  jobId: string,
  currentJobs: ActiveOpenRouterJob[],
): ActiveOpenRouterJob[] {
  const nextJobs = currentJobs.filter((job) => job.jobId !== jobId);
  if (nextJobs.length > 0) {
    persistActiveOpenRouterJobs(nextJobs);
  } else {
    clearActiveOpenRouterJob();
  }
  return nextJobs;
}

export function clearActiveOpenRouterJob(): void {
  safeRemoveLocalStorageItem(OPENROUTER_ACTIVE_JOB_STORAGE_KEY);
  safeRemoveLocalStorageItem(OPENROUTER_ACTIVE_JOBS_STORAGE_KEY);
}
