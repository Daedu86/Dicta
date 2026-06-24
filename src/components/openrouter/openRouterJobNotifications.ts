import {
  isOpenRouterJobCanceledError,
  type ActiveOpenRouterJob,
  type OpenRouterJobResponse,
} from '../../core/openRouterJobs';
import type { OpenRouterJobNotification } from './types';
import { formatElapsedMs } from './openRouterTimeFormatting';
import { formatOpenRouterSlotDisplayLabel } from './openRouterTrainingSlotLabels';

export function buildOpenRouterJobNotification(
  trackedJob: ActiveOpenRouterJob,
  job: OpenRouterJobResponse | null,
  error?: string,
): OpenRouterJobNotification {
  const resolvedError = error || job?.error || '';
  const status: OpenRouterJobNotification['status'] = error
    ? 'failed'
    : isOpenRouterJobCanceledError(resolvedError)
      ? 'canceled'
    : job?.status === 'succeeded' || job?.status === 'failed'
      ? job.status
      : 'running';
  return {
    jobId: trackedJob.jobId,
    slotLabel: trackedJob.slotLabel,
    model: trackedJob.model,
    startedAt: trackedJob.startedAt,
    status,
    ...(status === 'running' ? {} : { completedAt: job?.completedAt || job?.updatedAt || new Date().toISOString() }),
    ...(resolvedError ? { error: resolvedError } : {}),
  };
}

export function formatOpenRouterJobNotifications(notifications: Record<string, OpenRouterJobNotification>): string {
  const ordered = Object.values(notifications)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 4);
  if (ordered.length === 0) return '';

  return ordered
    .map((notification) => {
      const startedMs = new Date(notification.startedAt).getTime();
      const displayLabel = formatOpenRouterSlotDisplayLabel(notification.slotLabel);
      const elapsedMs =
        notification.completedAt
          ? new Date(notification.completedAt).getTime() - startedMs
          : Date.now() - startedMs;
      const elapsed = formatElapsedMs(Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0));
      if (notification.status === 'succeeded') {
        return `${displayLabel} finished with ${notification.model} in ${elapsed}.`;
      }
      if (notification.status === 'failed') {
        return `${displayLabel} failed with ${notification.model} after ${elapsed}${notification.error ? `: ${notification.error}` : '.'}`;
      }
      if (notification.status === 'canceled') {
        return `${displayLabel} canceled after ${elapsed}.`;
      }
      return `${displayLabel} running with ${notification.model}; elapsed ${elapsed}.`;
    })
    .join(' ');
}
