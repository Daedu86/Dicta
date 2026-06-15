import { useEffect } from 'react';

type UseSessionPersistenceExitFlushOptions = {
  flushScheduledSessionPersist: (spanName?: string) => void;
  flushPendingCriticalSessionRowsKeepalive: () => void;
};

export function useSessionPersistenceExitFlush({
  flushScheduledSessionPersist,
  flushPendingCriticalSessionRowsKeepalive,
}: UseSessionPersistenceExitFlushOptions): void {
  useEffect(() => {
    const flushBeforeExit = () => {
      flushScheduledSessionPersist('session.localStorage.flushBeforeExit');
      flushPendingCriticalSessionRowsKeepalive();
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        flushBeforeExit();
      }
    };
    window.addEventListener('pagehide', flushBeforeExit);
    window.addEventListener('beforeunload', flushBeforeExit);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      flushScheduledSessionPersist();
      flushPendingCriticalSessionRowsKeepalive();
      window.removeEventListener('pagehide', flushBeforeExit);
      window.removeEventListener('beforeunload', flushBeforeExit);
      document.removeEventListener('visibilitychange', flushWhenHidden);
    };
  }, [flushPendingCriticalSessionRowsKeepalive, flushScheduledSessionPersist]);
}
