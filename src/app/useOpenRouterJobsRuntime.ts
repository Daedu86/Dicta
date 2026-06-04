import { useCallback, useEffect, useRef, useState } from 'react';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import {
  addActiveOpenRouterJob,
  extractOpenRouterJobText,
  isOpenRouterJobTerminal,
  loadActiveOpenRouterJobs,
  removeActiveOpenRouterJob,
  type ActiveOpenRouterJob,
  type OpenRouterJobResponse,
} from '../core/openRouterJobs';
import {
  buildOpenRouterJobNotification,
  formatOpenRouterJobNotifications,
  stripJsonFence,
  validateGeneratedScriptForTarget,
} from '../components/openrouter/openRouterViewHelpers';
import type {
  BenchmarkLanguageButton,
  OpenRouterJobNotification,
  TrainingGenerationNotice,
} from '../components/openrouter/types';

type OpenRouterJobsRuntimeOptions = {
  localStorageReady: boolean;
  openRouterAccessAllowed: boolean;
  getAuthHeaders: () => Record<string, string>;
  onOpenRouterError: (message: string) => void;
  onCreateGenerationErrorSession: (trackedJob: ActiveOpenRouterJob, message: string) => void;
  onGeneratedScript: (script: DictationScript, trackedJob: ActiveOpenRouterJob) => void;
};

type OpenRouterJobsRuntime = {
  activeOpenRouterJobs: ActiveOpenRouterJob[];
  openRouterJobNotifications: Record<string, OpenRouterJobNotification>;
  openRouterJobStatus: string;
  trainingGenerationNotices: Record<string, TrainingGenerationNotice>;
  trainingGenerationNowMs: number;
  trackOpenRouterJob: (activeJob: ActiveOpenRouterJob) => void;
  recordOpenRouterGenerationFailure: (notice: {
    slotLabel: string;
    displayLabel: string;
    model: string;
    startedAt: string;
    error: string;
    completedAt?: string;
  }) => void;
  resetOpenRouterJobsRuntime: () => void;
};

export function useOpenRouterJobsRuntime({
  localStorageReady,
  openRouterAccessAllowed,
  getAuthHeaders,
  onOpenRouterError,
  onCreateGenerationErrorSession,
  onGeneratedScript,
}: OpenRouterJobsRuntimeOptions): OpenRouterJobsRuntime {
  const [activeOpenRouterJobs, setActiveOpenRouterJobs] = useState<ActiveOpenRouterJob[]>(() => loadActiveOpenRouterJobs());
  const [openRouterJobNotifications, setOpenRouterJobNotifications] = useState<Record<string, OpenRouterJobNotification>>({});
  const [openRouterJobStatus, setOpenRouterJobStatus] = useState('');
  const [trainingGenerationNotices, setTrainingGenerationNotices] = useState<Record<string, TrainingGenerationNotice>>({});
  const [trainingGenerationNowMs, setTrainingGenerationNowMs] = useState(() => Date.now());
  const consumedOpenRouterJobIdsRef = useRef<Set<string>>(new Set());
  const callbacksRef = useRef({
    getAuthHeaders,
    onOpenRouterError,
    onCreateGenerationErrorSession,
    onGeneratedScript,
  });

  useEffect(() => {
    callbacksRef.current = {
      getAuthHeaders,
      onOpenRouterError,
      onCreateGenerationErrorSession,
      onGeneratedScript,
    };
  }, [getAuthHeaders, onCreateGenerationErrorSession, onGeneratedScript, onOpenRouterError]);

  useEffect(() => {
    const hasRunningGenerationNotice = Object.values(trainingGenerationNotices).some((notice) => notice.status === 'running');
    if (!hasRunningGenerationNotice && activeOpenRouterJobs.length === 0) return;

    setTrainingGenerationNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setTrainingGenerationNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeOpenRouterJobs.length, trainingGenerationNotices]);

  useEffect(() => {
    if (!localStorageReady || activeOpenRouterJobs.length === 0 || !openRouterAccessAllowed) {
      return;
    }

    let cancelled = false;
    let intervalId = 0;

    async function pollOpenRouterJobs(): Promise<void> {
      const settledJobIds: string[] = [];
      const notifications: OpenRouterJobNotification[] = [];

      await Promise.all(
        activeOpenRouterJobs.map(async (trackedJob) => {
          try {
            const response = await fetch(`/api/openrouter/jobs?id=${encodeURIComponent(trackedJob.jobId)}`, {
              headers: callbacksRef.current.getAuthHeaders(),
            });
            if (!response.ok) {
              const text = await response.text();
              throw new Error(text || `OpenRouter job status failed (${response.status}).`);
            }
            const job = (await response.json()) as OpenRouterJobResponse;
            if (cancelled) return;

            const notification = buildOpenRouterJobNotification(trackedJob, job);
            notifications.push(notification);
            if (!isOpenRouterJobTerminal(job.status)) return;

            settledJobIds.push(trackedJob.jobId);
            if (job.status === 'failed') {
              const message = job.error || 'OpenRouter job failed.';
              failTrackedJob(trackedJob, message, job.completedAt || job.updatedAt || new Date().toISOString());
              return;
            }

            if (consumedOpenRouterJobIdsRef.current.has(trackedJob.jobId)) return;
            consumedOpenRouterJobIdsRef.current.add(trackedJob.jobId);

            const text = extractOpenRouterJobText(job.result);
            if (!text.trim()) {
              const message = 'OpenRouter job finished without usable text.';
              failTrackedJob(trackedJob, message, job.completedAt || job.updatedAt || new Date().toISOString());
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
                [trackedJob.slotLabel]: {
                  slotLabel: trackedJob.slotLabel,
                  displayLabel: formatGenerationDisplayLabel(trackedJob.slotLabel),
                  model: trackedJob.model,
                  startedAt: trackedJob.startedAt,
                  status: 'succeeded',
                  completedAt: job.completedAt || job.updatedAt || new Date().toISOString(),
                },
              }));
            } else {
              const message = validation.errors.join(' ') || 'Generated script did not validate.';
              failTrackedJob(trackedJob, message, job.completedAt || job.updatedAt || new Date().toISOString());
            }
          } catch (error) {
            if (cancelled) return;
            const message = error instanceof Error ? error.message : 'OpenRouter job polling failed.';
            notifications.push(buildOpenRouterJobNotification(trackedJob, null, message));
            failTrackedJob(trackedJob, message, new Date().toISOString(), { createErrorSession: false });
          }
        }),
      );

      if (cancelled) return;
      if (notifications.length > 0) {
        setOpenRouterJobNotifications((current) => {
          const next = { ...current };
          notifications.forEach((notification) => {
            next[notification.jobId] = notification;
          });
          const status = formatOpenRouterJobNotifications(next);
          setOpenRouterJobStatus(status);
          return next;
        });
      }
      if (settledJobIds.length > 0) {
        setActiveOpenRouterJobs((current) => {
          return settledJobIds.reduce((jobs, jobId) => removeActiveOpenRouterJob(jobId, jobs), current);
        });
      }
    }

    function failTrackedJob(
      trackedJob: ActiveOpenRouterJob,
      message: string,
      completedAt: string,
      options: { createErrorSession?: boolean } = {},
    ): void {
      callbacksRef.current.onOpenRouterError(message);
      if (options.createErrorSession !== false) {
        callbacksRef.current.onCreateGenerationErrorSession(trackedJob, message);
      }
      setTrainingGenerationNotices((current) => ({
        ...current,
        [trackedJob.slotLabel]: {
          slotLabel: trackedJob.slotLabel,
          displayLabel: formatGenerationDisplayLabel(trackedJob.slotLabel),
          model: trackedJob.model,
          startedAt: trackedJob.startedAt,
          status: 'failed',
          completedAt,
          error: message,
        },
      }));
    }

    void pollOpenRouterJobs();
    intervalId = window.setInterval(() => {
      void pollOpenRouterJobs();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeOpenRouterJobs, localStorageReady, openRouterAccessAllowed]);

  const trackOpenRouterJob = useCallback((activeJob: ActiveOpenRouterJob): void => {
    setActiveOpenRouterJobs((current) => addActiveOpenRouterJob(activeJob, current));
    setOpenRouterJobNotifications((current) => {
      const next = {
        ...current,
        [activeJob.jobId]: {
          jobId: activeJob.jobId,
          slotLabel: activeJob.slotLabel,
          model: activeJob.model,
          startedAt: activeJob.startedAt,
          status: 'running' as const,
        },
      };
      setOpenRouterJobStatus(formatOpenRouterJobNotifications(next));
      return next;
    });
  }, []);

  const recordOpenRouterGenerationFailure = useCallback((notice: {
    slotLabel: string;
    displayLabel: string;
    model: string;
    startedAt: string;
    error: string;
    completedAt?: string;
  }): void => {
    setTrainingGenerationNotices((current) => ({
      ...current,
      [notice.slotLabel]: {
        slotLabel: notice.slotLabel,
        displayLabel: notice.displayLabel,
        model: notice.model,
        startedAt: notice.startedAt,
        status: 'failed',
        completedAt: notice.completedAt ?? new Date().toISOString(),
        error: notice.error,
      },
    }));
  }, []);

  const resetOpenRouterJobsRuntime = useCallback((): void => {
    consumedOpenRouterJobIdsRef.current = new Set();
    setActiveOpenRouterJobs(loadActiveOpenRouterJobs());
    setOpenRouterJobNotifications({});
    setOpenRouterJobStatus('');
    setTrainingGenerationNotices({});
  }, []);

  return {
    activeOpenRouterJobs,
    openRouterJobNotifications,
    openRouterJobStatus,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    trackOpenRouterJob,
    recordOpenRouterGenerationFailure,
    resetOpenRouterJobsRuntime,
  };
}

function formatGenerationDisplayLabel(slotLabel: string): string {
  const normalized = slotLabel.toLowerCase();
  if (normalized.includes('express') && normalized.includes('easy')) return 'Express easy session';
  if (normalized.includes('express') && normalized.includes('intermediate')) return 'Express medium session';
  if (normalized.includes('express') && normalized.includes('advanced')) return 'Express hard session';
  if (normalized.includes('easy')) return 'Easy session';
  if (normalized.includes('intermediate')) return 'Medium session';
  if (normalized.includes('advanced')) return 'Hard session';
  return slotLabel;
}
