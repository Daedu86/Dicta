import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import { perfDiagnostics } from '../../core/perfDiagnostics';
import { buildSessionPersistenceQuotaRecoverySessions } from '../sessionPersistenceRecoveryPlan';
import {
  SESSION_PERSIST_DEBOUNCE_MS,
  SESSION_STORAGE_KEY,
} from './sessionPersistenceSyncConstants';
import type { PersistableSession } from './sessionPersistenceSyncTypes';

export type SessionLocalPersistenceController<TSession extends PersistableSession> = {
  clearScheduledSessionPersist: () => void;
  persistSessionsToLocalStorage: (nextSessions: TSession[], spanName?: string) => void;
  flushScheduledSessionPersist: (spanName?: string) => void;
};

type UseSessionLocalPersistenceOptions<TSession extends PersistableSession> = {
  activeSessionId: string;
  latestSessionsForPersistenceRef: MutableRefObject<TSession[]>;
  sessionPersistTimerRef: MutableRefObject<number | null>;
  lastPersistedSessionsJsonRef: MutableRefObject<string | null>;
  supabaseInitialSyncPendingRef: MutableRefObject<boolean>;
  normalizeSessionForPersistence: (session: TSession) => TSession;
  onQuotaRecovered: (message: string) => void;
};

export function useSessionLocalPersistence<TSession extends PersistableSession>({
  activeSessionId,
  latestSessionsForPersistenceRef,
  sessionPersistTimerRef,
  lastPersistedSessionsJsonRef,
  supabaseInitialSyncPendingRef,
  normalizeSessionForPersistence,
  onQuotaRecovered,
}: UseSessionLocalPersistenceOptions<TSession>): SessionLocalPersistenceController<TSession> {
  const clearScheduledSessionPersist = useCallback((): void => {
    if (sessionPersistTimerRef.current === null) return;
    window.clearTimeout(sessionPersistTimerRef.current);
    sessionPersistTimerRef.current = null;
  }, [sessionPersistTimerRef]);

  const persistSessionsToLocalStorage = useCallback((nextSessions: TSession[], spanName = 'session.localStorage.persist'): void => {
    perfDiagnostics.withSpan(spanName, () => {
      const json = JSON.stringify(nextSessions.map((session) => normalizeSessionForPersistence(session)));
      if (json === lastPersistedSessionsJsonRef.current) return;

      try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, json);
        lastPersistedSessionsJsonRef.current = json;
      } catch (error) {
        if (!isLocalStorageQuotaExceeded(error)) {
          throw error;
        }

        const recoveryJson = JSON.stringify(buildSessionPersistenceQuotaRecoverySessions({
          sessions: nextSessions,
          activeSessionId,
          normalizeSessionForPersistence,
        }));
        window.localStorage.setItem(SESSION_STORAGE_KEY, recoveryJson);
        lastPersistedSessionsJsonRef.current = recoveryJson;
        onQuotaRecovered('Local session storage was full. Dicta compacted older session telemetry so the current session can keep saving.');
      }
    }, { sessionCount: nextSessions.length });
  }, [activeSessionId, lastPersistedSessionsJsonRef, normalizeSessionForPersistence, onQuotaRecovered]);

  const flushScheduledSessionPersist = useCallback((spanName = 'session.localStorage.flush'): void => {
    clearScheduledSessionPersist();
    if (supabaseInitialSyncPendingRef.current) return;
    persistSessionsToLocalStorage(latestSessionsForPersistenceRef.current, spanName);
  }, [clearScheduledSessionPersist, latestSessionsForPersistenceRef, persistSessionsToLocalStorage, supabaseInitialSyncPendingRef]);

  return {
    clearScheduledSessionPersist,
    persistSessionsToLocalStorage,
    flushScheduledSessionPersist,
  };
}

type UseDebouncedSessionLocalPersistenceOptions<TSession extends PersistableSession> = {
  sessions: TSession[];
  localStorageReadyForEffectiveProfile: boolean;
  supabaseInitialSyncPending: boolean;
  latestSessionsForPersistenceRef: MutableRefObject<TSession[]>;
  sessionPersistTimerRef: MutableRefObject<number | null>;
  clearScheduledSessionPersist: () => void;
  persistSessionsToLocalStorage: (nextSessions: TSession[], spanName?: string) => void;
};

export function useDebouncedSessionLocalPersistence<TSession extends PersistableSession>({
  sessions,
  localStorageReadyForEffectiveProfile,
  supabaseInitialSyncPending,
  latestSessionsForPersistenceRef,
  sessionPersistTimerRef,
  clearScheduledSessionPersist,
  persistSessionsToLocalStorage,
}: UseDebouncedSessionLocalPersistenceOptions<TSession>): void {
  useEffect(() => {
    latestSessionsForPersistenceRef.current = sessions;
    if (!localStorageReadyForEffectiveProfile || supabaseInitialSyncPending) {
      clearScheduledSessionPersist();
      return;
    }
    clearScheduledSessionPersist();
    sessionPersistTimerRef.current = window.setTimeout(() => {
      sessionPersistTimerRef.current = null;
      persistSessionsToLocalStorage(latestSessionsForPersistenceRef.current);
    }, SESSION_PERSIST_DEBOUNCE_MS);
  }, [
    clearScheduledSessionPersist,
    latestSessionsForPersistenceRef,
    localStorageReadyForEffectiveProfile,
    persistSessionsToLocalStorage,
    sessionPersistTimerRef,
    sessions,
    supabaseInitialSyncPending,
  ]);
}

export function isLocalStorageQuotaExceeded(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    candidate.code === 22 ||
    candidate.code === 1014
  );
}
