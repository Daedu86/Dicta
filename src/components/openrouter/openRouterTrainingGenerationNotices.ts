import type { ActiveOpenRouterJob } from '../../core/openRouterJobs';
import type {
  OpenRouterGenerationSlotId,
  OpenRouterJobNotification,
  TrainingGenerationNotice,
  TrainingGenerationNoticeView,
} from './types';
import { formatElapsedMs, parseTimestampMs } from './openRouterTimeFormatting';
import { getOpenRouterTrainingSlotAliases } from './openRouterTrainingSlotLabels';

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
  const slotAliases = getOpenRouterTrainingSlotAliases(slotLabel);
  const localNotice = slotAliases.map((alias) => notices[alias]).find(Boolean);
  const activeJob = [...activeJobs]
    .filter((job) => slotAliases.includes(job.slotLabel))
    .sort((a, b) => parseTimestampMs(b.startedAt, nowMs) - parseTimestampMs(a.startedAt, nowMs))[0];
  if (activeJob) {
    return formatTrainingGenerationNotice({
      slotLabel: activeJob.slotLabel,
      displayLabel,
      model: activeJob.model,
      startedAt: activeJob.startedAt,
      status: 'running',
    }, nowMs);
  }

  if (localNotice && localNotice.status !== 'running') {
    return formatTrainingGenerationNotice({ ...localNotice, displayLabel }, nowMs);
  }

  const jobNotification = Object.values(jobNotifications)
    .filter((notification) => slotAliases.includes(notification.slotLabel))
    .sort((a, b) => parseTimestampMs(b.startedAt, nowMs) - parseTimestampMs(a.startedAt, nowMs))[0];
  if (jobNotification) {
    return formatTrainingGenerationNotice({
      slotLabel: jobNotification.slotLabel,
      displayLabel,
      model: jobNotification.model,
      startedAt: jobNotification.startedAt,
      status: jobNotification.status,
      completedAt: jobNotification.completedAt,
      error: jobNotification.error,
    }, nowMs);
  }

  if (localNotice) {
    return formatTrainingGenerationNotice({ ...localNotice, displayLabel }, nowMs);
  }

  return null;
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

  return {
    tone: 'hint',
    message: `${notice.displayLabel} is being created... elapsed ${elapsed}.`,
  };
}

export function getOpenRouterSlotLabel(slotId: OpenRouterGenerationSlotId): string {
  return slotId === 'prompt1' ? 'Session 1' : 'Session 2';
}

export function formatInterruptedOpenRouterMessage(slotLabel: string, model: string, elapsedMs: number): string {
  return `${slotLabel} request for ${model} was interrupted after ${formatElapsedMs(elapsedMs)}. It may still finish in the background.`;
}

export function formatTrainingGenerationNoticeMessage(notice: TrainingGenerationNoticeView | null): string {
  return notice?.message ?? '';
}
