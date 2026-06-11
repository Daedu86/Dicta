import { useCallback } from 'react';

export type SessionQuotaMessageTarget = 'error' | 'openrouter' | 'export';

type SessionQuotaStatus = {
  blocked: boolean;
  message: string;
};

type UseSessionQuotaActionsArgs = {
  sessionQuotaStatus: SessionQuotaStatus;
  setError: (message: string) => void;
  setOpenRouterError: (message: string) => void;
  setExportMessage: (message: string) => void;
};

export function useSessionQuotaActions({
  sessionQuotaStatus,
  setError,
  setOpenRouterError,
  setExportMessage,
}: UseSessionQuotaActionsArgs) {
  const ensureCanCreateDictationSession = useCallback((
    messageTarget: SessionQuotaMessageTarget = 'error',
  ): boolean => {
    if (!sessionQuotaStatus.blocked) return true;

    const message = sessionQuotaStatus.message;
    if (messageTarget === 'openrouter') {
      setOpenRouterError(message);
    } else if (messageTarget === 'export') {
      setExportMessage(message);
    } else {
      setError(message);
    }

    return false;
  }, [
    sessionQuotaStatus.blocked,
    sessionQuotaStatus.message,
    setError,
    setExportMessage,
    setOpenRouterError,
  ]);

  return {
    ensureCanCreateDictationSession,
  };
}
