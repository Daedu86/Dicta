import { isSubmittedFinishedAttempt } from '../core/sessionNormalization';
import { formatSessionStatus } from './sessionStatusFormatters';

export function formatLeaderboardSessionStatus(session: { status: string }): string {
  if (session.status === 'finished' && !isSubmittedFinishedAttempt(session)) {
    return 'Not submitted';
  }

  return formatSessionStatus(session.status);
}
