import type { SessionQuotaStatus } from './SessionCreateCardTypes';

type SessionCreateQuotaHintProps = {
  sessionQuotaStatus: SessionQuotaStatus;
};

export function SessionCreateQuotaHint({ sessionQuotaStatus }: SessionCreateQuotaHintProps) {
  if (sessionQuotaStatus.limit === null) {
    return null;
  }

  return (
    <p className={sessionQuotaStatus.blocked ? 'error' : 'session-create-hint'}>
      {sessionQuotaStatus.blocked
        ? sessionQuotaStatus.message
        : `Sessions available: ${sessionQuotaStatus.used}/${sessionQuotaStatus.limit}.`}
    </p>
  );
}
