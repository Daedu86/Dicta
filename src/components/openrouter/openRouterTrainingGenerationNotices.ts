import type { ActiveOpenRouterJob } from '../../core/openRouterJobs';
import type {
  OpenRouterJobNotification,
  TrainingGenerationNotice,
  TrainingGenerationNoticeView,
} from './types';
import { formatElapsedMs, parseTimestampMs } from './openRouterTimeFormatting';
import { getOpenRouterTrainingSlotAliases } from './openRouterTrainingSlotLabels';

export type TrainingGenerationNoticeListItem = TrainingGenerationNoticeView & {
  id: string;
  jobId?: string;
  status: TrainingGenerationNotice['status'];
  startedAt: string;
};

export function buildTrainingGenerationButtonNotice({
  slotLabel,
  displayLabel,
  notices,
  jobNotifications,
  activeJobs,
  nowMs,
}: {
  slotLabel: string;
  displayLabel: string;
  notices: Record<string, TrainingGenerationNotice>;
  jobNotifications: Record<string, OpenRouterJobNotification>;
  activeJobs: ActiveOpenRouterJob[];
  nowMs: number;
}): TrainingGenerationNoticeView | null {
  return buildTrainingGenerationButtonNoticeList({
    slotLabel,
    displayLabel,
    notices,
    jobNotifications,
    activeJobs,
    nowMs,
  })[0] ?? null;
}

export function buildTrainingGenerationButtonNoticeList({
  slotLabel,
  displayLabel,
  notices,
  jobNotifications,
  activeJobs,
  nowMs,
}: {
  slotLabel: string;
  displayLabel: string;
  notices: Record<string, TrainingGenerationNotice>;
  jobNotifications: Record<string, OpenRouterJobNotification>;
  activeJobs: ActiveOpenRouterJob[];
  nowMs: number;
}): TrainingGenerationNoticeListItem[] {
  const slotAliases = getOpenRouterTrainingSlotAliases(slotLabel);
  const activeJobIds = new Set(activeJobs.map((job) => job.jobId));
  const byId = new Map<string, TrainingGenerationNoticeListItem>();

  activeJobs
    .filter((job) => slotAliases.includes(job.slotLabel))
    .forEach((activeJob) => {
      byId.set(activeJob.jobId, formatTrainingGenerationNoticeListItem({
        id: activeJob.jobId,
        jobId: activeJob.jobId,
        notice: {
          slotLabel: activeJob.slotLabel,
          displayLabel,
          model: activeJob.model,
          startedAt: activeJob.startedAt,
          status: 'running',
        },
        nowMs,
      }));
    });

  Object.values(jobNotifications)
    .filter((notification) => slotAliases.includes(notification.slotLabel) && !activeJobIds.has(notification.jobId))
    .forEach((jobNotification) => {
      byId.set(jobNotification.jobId, formatTrainingGenerationNoticeListItem({
        id: jobNotification.jobId,
        jobId: jobNotification.jobId,
        notice: {
          slotLabel: jobNotification.slotLabel,
          displayLabel,
          model: jobNotification.model,
          startedAt: jobNotification.startedAt,
          status: jobNotification.status,
          completedAt: jobNotification.completedAt,
          error: jobNotification.error,
        },
        nowMs,
      }));
    });

  Object.entries(notices)
    .filter(([, notice]) => slotAliases.includes(notice.slotLabel))
    .forEach(([key, localNotice]) => {
      const id = localNotice.jobId ?? key;
      if (byId.has(id)) return;
      byId.set(id, formatTrainingGenerationNoticeListItem({
        id,
        jobId: localNotice.jobId,
        notice: { ...localNotice, displayLabel },
        nowMs,
      }));
    });

  return Array.from(byId.values())
    .sort((a, b) => parseTimestampMs(b.startedAt, nowMs) - parseTimestampMs(a.startedAt, nowMs))
    .slice(0, 6);
}

function formatTrainingGenerationNoticeListItem({
  id,
  jobId,
  notice,
  nowMs,
}: {
  id: string;
  jobId?: string;
  notice: TrainingGenerationNotice;
  nowMs: number;
}): TrainingGenerationNoticeListItem {
  return {
    id,
    jobId,
    status: notice.status,
    startedAt: notice.startedAt,
    ...formatTrainingGenerationNotice(notice, nowMs),
  };
}

export function formatTrainingGenerationNotice(
  notice: TrainingGenerationNotice,
  nowMs: number,
): TrainingGenerationNoticeView {
  const startedMs = parseTimestampMs(notice.startedAt, nowMs);
  const completedMs = notice.completedAt ? parseTimestampMs(notice.completedAt, nowMs) : nowMs;
  const elapsed = formatElapsedMs(Math.max(0, completedMs - startedMs));

  if (notice.status === 'succeeded') {
    return {
      tone: 'success',
      message: `${notice.displayLabel} created in ${elapsed}.`,
    };
  }

  if (notice.status === 'failed') {
    return {
      tone: 'error',
      message: `${notice.displayLabel} could not be created after ${elapsed}${notice.error ? `: ${notice.error}` : '.'}`,
    };
  }

  if (notice.status === 'canceled') {
    return {
      tone: 'hint',
      message: `${notice.displayLabel} canceled after ${elapsed}.`,
    };
  }

  return {
    tone: 'hint',
    message: `${notice.displayLabel} is being created... elapsed ${elapsed}.`,
  };
}

export function formatInterruptedOpenRouterMessage(slotLabel: string, model: string, elapsedMs: number): string {
  return `${slotLabel} request for ${model} was interrupted after ${formatElapsedMs(elapsedMs)}. It may still finish in the background.`;
}

export function formatTrainingGenerationNoticeMessage(notice: TrainingGenerationNoticeView | null): string {
  return notice?.message ?? '';
}
