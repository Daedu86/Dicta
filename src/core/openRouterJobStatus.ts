import type { OpenRouterJobStatus } from './openRouterJobTypes';

export const OPENROUTER_JOB_CANCELED_MESSAGE = 'Canceled by user.';

export function isOpenRouterJobTerminal(status: OpenRouterJobStatus): boolean {
  return status === 'succeeded' || status === 'failed';
}

export function isOpenRouterJobCanceledError(error: string | undefined | null): boolean {
  return typeof error === 'string' && error.trim().toLocaleLowerCase() === OPENROUTER_JOB_CANCELED_MESSAGE.toLocaleLowerCase();
}
