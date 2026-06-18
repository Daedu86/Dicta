import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { perfDiagnostics } from '../../core/perfDiagnostics';
import { trySetLocalStorageItem } from '../localStorageQuota';
import {
  buildSessionPersistenceQuotaRecoverySessions,
  buildSessionPersistenceStorageSessions,
} from '../sessionPersistenceRecoveryPlan';
import {
  SESSION_PERSIST_DEBOUNCE_MS,
  SESSION_STORAGE_KEY,
} from './sessionPersistenceSyncConstants';
import { filterSessionsByRetention } from '../sessionRetentionPolicy';
import type { PersistableSession } from './sessionPersistenceSyncTypes';

type SessionLocalPayloadWriter<TSession extends PersistableSession> = {
  saveSessions: (profileId: string, sessions: readonly TSession[]) => Promise<void>;
};

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
  localPayloadProfileId: string;
  localPayloadStore?: SessionLocalPayloadWriter<TSession>;
  normalizeSessionForPersistence: (session: TSession) => TSession;
  onQuotaRecovered: (message: string) => void;
};

export function useSessionLocalPersistence<TSession extends PersistableSession>({
  activeSessionId,
  latestSessionsForPersistenceRef,
  sessionPersistTimerRef,
  lastPersistedSessionsJsonRef,
  supabaseInitialSyncPendingRef,
  localPayloadProfileId,
  localPayloadStore,
  normalizeSessionForPersistence,
  onQuotaRecovered,
}: UseSessionLocalPersistenceOptions<TSession>): SessionLocalPersistenceController<TSession> {
  const quotaRecoveryNoticeShownRef = useRef(false);

  const clearScheduledSessionPersist = useCallback((): void => {
    if (sessionPersistTimerRef.current === null) return;
    window.clearTimeout(sessionPersistTimerRef.current);
    sessionPersistTimerRef.current = null;
  }, [sessionPersistTimerRef]);

  const persistSessionsToLocalStorage = useCallback((nextSessions: TSession[], spanName = 'session.localStorage.persist'): void => {
    perfDiagnostics.withSpan(spanName, () => {
      const retainedSessions = filterSessionsByRetention(nextSessions);
      const storageSessions = buildSessionPersistenceStorageSessions({
        sessions: retainedSessions,
        activeSessionId,
        normalizeSessionForPersistence,
      });
      const json = JSON.stringify(storageSessions);
      if (json === lastPersistedSessionsJsonRef.current) return;

      if (localPayloadStore) {
        void localPayloadStore.saveSessions(localPayloadProfileId, storageSessions).then(() => {
          lastPersistedSessionsJsonRef.current = json;
          quotaRecoveryNoticeShownRef.current = false;
        }).catch((error: unknown) => {
          console.warn('[DictaStorage] IndexedDB session write failed.', error);
          if (!quotaRecoveryNoticeShownRef.current) {
            quotaRecoveryNoticeShownRef.current = true;
            onQuotaRecovered('Local IndexedDB session storage failed. Dicta kept running, but this local snapshot may need Supabase sync to recover.');
          }
        });
        return;
      }

      const writeResult = trySetLocalStorageItem(SESSION_STORAGE_KEY, json);
      if (writeResult.ok) {
        lastPersistedSessionsJsonRef.current = json;
        quotaRecoveryNoticeShownRef.current = false;
        return;
      }

      const recoveryJson = JSON.stringify(buildSessionPersistenceQuotaRecoverySessions({
        sessions: retainedSessions,
        activeSessionId,
        normalizeSessionForPersistence,
      }));
      const recoveryWriteResult = trySetLocalStorageItem(SESSION_STORAGE_KEY, recoveryJson);
      if (recoveryWriteResult.ok) {
        lastPersistedSessionsJsonRef.current = recoveryJson;
        if (!quotaRecoveryNoticeShownRef.current) {
          quotaRecoveryNoticeShownRef.current = true;
          onQuotaRecovered('Local session storage was full. Dicta compacted older session telemetry so the current session can keep saving.');
        }
        return;
      }

      if (!quotaRecoveryNoticeShownRef.current) {
        quotaRecoveryNoticeShownRef.current = true;
        onQuotaRecovered('Local session storage is full. Dicta could not save the latest local session snapshot, but the app will keep running.');
      }
    }, { sessionCount: nextSessions.length });
  }, [
    activeSessionId,
    lastPersistedSessionsJsonRef,
    localPayloadProfileId,
    localPayloadStore,
    normalizeSessionForPersistence,
    onQuotaRecovered,
  ]);

  const flushScheduledSessionPersist = useCallback((spanName = 'session.localStorage.flush'): void => {
    const hadScheduledPersist = sessionPersistTimerRef.current !== null;
    clearScheduledSessionPersist();
    if (!hadScheduledPersist && spanName === 'session.localStorage.flush') return;
    if (supabaseInitialSyncPendingRef.current) return;
    persistSessionsToLocalStorage(latestSessionsForPersistenceRef.current, spanName);
  }, [
    clearScheduledSessionPersist,
    latestSessionsForPersistenceRef,
    persistSessionsToLocalStorage,
    sessionPersistTimerRef,
    supabaseInitialSyncPendingRef,
  ]);

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
  pendingHydratedSessionsRef: MutableRefObject<TSession[] | null>;
  sessionPersistTimerRef: MutableRefObject<number | null>;
  clearScheduledSessionPersist: () => void;
  persistSessionsToLocalStorage: (nextSessions: TSession[], spanName?: string) => void;
};

export function useDebouncedSessionLocalPersistence<TSession extends PersistableSession>({
  sessions,
  localStorageReadyForEffectiveProfile,
  supabaseInitialSyncPending,
  latestSessionsForPersistenceRef,
  pendingHydratedSessionsRef,
  sessionPersistTimerRef,
  clearScheduledSessionPersist,
  persistSessionsToLocalStorage,
}: UseDebouncedSessionLocalPersistenceOptions<TSession>): void {
  useEffect(() => {
    if (pendingHydratedSessionsRef.current && sessions !== pendingHydratedSessionsRef.current) {
      clearScheduledSessionPersist();
      return;
    }
    if (pendingHydratedSessionsRef.current === sessions) {
      pendingHydratedSessionsRef.current = null;
    }
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
    pendingHydratedSessionsRef,
    persistSessionsToLocalStorage,
    sessionPersistTimerRef,
    sessions,
    supabaseInitialSyncPending,
  ]);
}
