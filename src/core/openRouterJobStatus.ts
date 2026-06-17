import type { OpenRouterJobStatus } from './openRouterJobTypes';

export function isOpenRouterJobTerminal(status: OpenRouterJobStatus): boolean {
  return status === 'succeeded' || status === 'failed';
}
