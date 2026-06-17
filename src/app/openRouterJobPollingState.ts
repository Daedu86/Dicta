import {
  removeActiveOpenRouterJob,
} from '../core/openRouterJobs';
import {
  formatOpenRouterJobNotifications,
} from '../components/openrouter/openRouterViewHelpers';
import type { OpenRouterJobNotification } from '../components/openrouter/types';
import type {
  ActiveOpenRouterJobsSetter,
  OpenRouterJobNotificationsSetter,
  OpenRouterJobStatusSetter,
} from './openRouterJobPollingTypes';

export type ApplyOpenRouterJobNotificationsArgs = {
  notifications: OpenRouterJobNotification[];
  setOpenRouterJobNotifications: OpenRouterJobNotificationsSetter;
  setOpenRouterJobStatus: OpenRouterJobStatusSetter;
};

export function applyOpenRouterJobNotifications({
  notifications,
  setOpenRouterJobNotifications,
  setOpenRouterJobStatus,
}: ApplyOpenRouterJobNotificationsArgs): void {
  if (notifications.length === 0) return;

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

export type RemoveSettledOpenRouterJobsArgs = {
  settledJobIds: string[];
  setActiveOpenRouterJobs: ActiveOpenRouterJobsSetter;
};

export function removeSettledOpenRouterJobs({
  settledJobIds,
  setActiveOpenRouterJobs,
}: RemoveSettledOpenRouterJobsArgs): void {
  if (settledJobIds.length === 0) return;

  setActiveOpenRouterJobs((current) =>
    settledJobIds.reduce((jobs, jobId) => removeActiveOpenRouterJob(jobId, jobs), current),
  );
}
