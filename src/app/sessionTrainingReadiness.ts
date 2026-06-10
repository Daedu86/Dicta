import { isSubmittedFinishedAttempt } from '../core/sessionNormalization';

export function isSessionReadyForTraining(session: { status?: unknown }): boolean {
  if (session.status === 'error') {
    return false;
  }

  if (session.status !== 'finished') {
    return false;
  }

  return isSubmittedFinishedAttempt(session);
}
