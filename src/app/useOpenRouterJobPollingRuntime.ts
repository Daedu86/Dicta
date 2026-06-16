import { useCallback, useEffect, useRef } from 'react';
import {
  extractOpenRouterJobText,
  isOpenRouterJobTerminal,
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
import type { BenchmarkLanguageButton, OpenRouterJobNotification } from '../components/openrouter/types';
import {
  buildTrackedOpenRouterGenerationFailureNotice,
  formatOpenRouterGenerationDisplayLabel,
} from './openRouterGenerationFailurePolicy';
import type {
  OpenRouterJobPollingRuntime,
  OpenRouterJobPollingRuntimeOptions,
} from './useOpenRouterJobPollingRuntimeTypes';

export type {
  OpenRouterJobPollingRuntime,
  OpenRouterJobPollingRuntimeOptions,
} from './useOpenRouterJobPollingRuntimeTypes';

export function useOpenRouterJobPollingRuntime({
  activeOpenRouterJobs,
  localStorageReady,
  openRouterAccessAllowed,
  getAuthHeaders,
  onOpenRouterError,
  onCreateGenerationErrorSession,
  onGeneratedScript,
  setActiveOpenRouterJobs,
  setOpenRouterJobNotifications,
  setOpenRouterJobStatus,
  setTrainingGenerationNotices,
}: OpenRouterJobPollingRuntimeOptions): OpenRouterJobPollingRuntime {
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
    if (!localStorageReady || activeOpenRouterJobs.length === 0 || !openRouterAccessAllowed) {
      return;
    }

    let cancelled = false;
    let intervalId = 0;

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
        [trackedJob.slotLabel]: buildTrackedOpenRouterGenerationFailureNotice(trackedJob, message, completedAt),
      }));
    }

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
            const completedAt = job.completedAt || job.updatedAt || new Date().toISOString();
            if (job.status === 'failed') {
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
                [trackedJob.slotLabel]: {
                  slotLabel: trackedJob.slotLabel,
                  displayLabel: formatOpenRouterGenerationDisplayLabel(trackedJob.slotLabel),
                  model: trackedJob.model,
                  startedAt: trackedJob.startedAt,
                  status: 'succeeded',
                  completedAt,
                },
              }));
            } else {
              const message = validation.errors.join(' ') || 'Generated script did not validate.';
              failTrackedJob(trackedJob, message, completedAt);
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

    void pollOpenRouterJobs();
    intervalId = window.setInterval(() => {
      void pollOpenRouterJobs();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeOpenRouterJobs,
    localStorageReady,
    openRouterAccessAllowed,
    setActiveOpenRouterJobs,
    setOpenRouterJobNotifications,
    setOpenRouterJobStatus,
    setTrainingGenerationNotices,
  ]);

  const resetOpenRouterJobPollingRuntime = useCallback((): void => {
    consumedOpenRouterJobIdsRef.current = new Set();
  }, []);

  return { resetOpenRouterJobPollingRuntime };
}
