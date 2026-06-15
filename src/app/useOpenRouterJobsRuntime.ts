import { useCallback, useEffect, useState } from 'react';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import {
  addActiveOpenRouterJob,
  loadActiveOpenRouterJobs,
  type ActiveOpenRouterJob,
} from '../core/openRouterJobs';
import { formatOpenRouterJobNotifications } from '../components/openrouter/openRouterViewHelpers';
import type { OpenRouterJobNotification, TrainingGenerationNotice } from '../components/openrouter/types';
import { useOpenRouterJobPollingRuntime } from './useOpenRouterJobPollingRuntime';

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

  const { resetOpenRouterJobPollingRuntime } = useOpenRouterJobPollingRuntime({
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
  });

  useEffect(() => {
    const hasRunningGenerationNotice = Object.values(trainingGenerationNotices).some((notice) => notice.status === 'running');
    if (!hasRunningGenerationNotice && activeOpenRouterJobs.length === 0) return;

    setTrainingGenerationNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setTrainingGenerationNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeOpenRouterJobs.length, trainingGenerationNotices]);

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
    resetOpenRouterJobPollingRuntime();
    setActiveOpenRouterJobs(loadActiveOpenRouterJobs());
    setOpenRouterJobNotifications({});
    setOpenRouterJobStatus('');
    setTrainingGenerationNotices({});
  }, [resetOpenRouterJobPollingRuntime]);

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
