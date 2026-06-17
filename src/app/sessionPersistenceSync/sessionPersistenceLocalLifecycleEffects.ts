import type { MutableRefObject } from 'react';
import { useDebouncedSessionLocalPersistence } from './sessionPersistenceLocalStorage';
import { useSessionPersistenceExitFlush } from './sessionPersistenceLifecycle';
import type { PersistableSession } from './sessionPersistenceSyncTypes';

export function useSessionPersistenceLocalLifecycleEffects<TSession extends PersistableSession>({
  sessions,
  localStorageReadyForEffectiveProfile,
  supabaseInitialSyncPending,
  latestSessionsForPersistenceRef,
  sessionPersistTimerRef,
  clearScheduledSessionPersist,
  persistSessionsToLocalStorage,
  flushScheduledSessionPersist,
  flushPendingCriticalSessionRowsKeepalive,
}: {
  sessions: TSession[];
  localStorageReadyForEffectiveProfile: boolean;
  supabaseInitialSyncPending: boolean;
  latestSessionsForPersistenceRef: MutableRefObject<TSession[]>;
  sessionPersistTimerRef: MutableRefObject<number | null>;
  clearScheduledSessionPersist: () => void;
  persistSessionsToLocalStorage: (nextSessions: TSession[], spanName?: string) => void;
  flushScheduledSessionPersist: (spanName?: string) => void;
  flushPendingCriticalSessionRowsKeepalive: () => void;
}): void {
  useDebouncedSessionLocalPersistence({
    sessions,
    localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending,
    latestSessionsForPersistenceRef,
    sessionPersistTimerRef,
    clearScheduledSessionPersist,
    persistSessionsToLocalStorage,
  });

  useSessionPersistenceExitFlush({
    flushScheduledSessionPersist,
    flushPendingCriticalSessionRowsKeepalive,
  });
}
