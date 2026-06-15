import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionTelemetry } from '../types/dictation';
import {
  OPENROUTER_ACTIVE_JOB_STORAGE_KEY,
  OPENROUTER_ACTIVE_JOBS_STORAGE_KEY,
} from '../core/openRouterJobs';
import {
  buildSyncItems,
  DICTA_SYNC_TABLE,
  deleteSessionSyncRow,
  latestSyncRowTimestamp,
  mergeSyncRowSnapshots,
  mergeSyncRows,
  pullSyncRows,
  pushSyncRowsDetailed,
  selectPushableSyncRows,
  toSyncRows,
  type DictaSyncConfig,
  type DictaSyncRow,
  type DictaSyncState,
} from '../core/supabaseSync';
import {
  readActiveSyncStorageProfileId,
  switchProfileScopedStorage,
} from '../core/profileScopedStorage';
import { isTransientGenerationErrorSessionLike } from '../core/adaptive/openRouterFallbackScript';
import {
  OPENROUTER_GENERATED_SCRIPT_KEY,
  OPENROUTER_GENERATED_VARIANTS_KEY,
} from '../components/openrouter/openRouterViewHelpers';
import { perfDiagnostics } from '../core/perfDiagnostics';
import { compactTelemetryForStorage } from './sessionPersistenceCompaction';

export const SESSION_STORAGE_KEY = 'dicta.sessions.v1';
export const DELETED_SESSION_IDS_KEY = 'dicta.deletedSessionIds.v1';
export const ADAPTIVE_BENCHMARKS_KEY = 'dicta.adaptiveBenchmarks.v1';
export const ADAPTIVE_SESSION_FEEDBACK_KEY = 'dicta.adaptiveSessionFeedback.v1';

const SESSION_PERSIST_DEBOUNCE_MS = 1500;
const SESSION_PERSIST_RECOVERY_MAX_SESSIONS = 50;
const SESSION_PERSIST_RECOVERY_FULL_TELEMETRY_SESSIONS = 8;
const SUPABASE_BACKGROUND_PULL_INTERVAL_MS = 15_000;
const SUPABASE_KEEPALIVE_BODY_MAX_BYTES = 60_000;

const PROFILE_SCOPED_DICTA_STORAGE_KEYS = [
  SESSION_STORAGE_KEY,
  DELETED_SESSION_IDS_KEY,
  ADAPTIVE_BENCHMARKS_KEY,
  ADAPTIVE_SESSION_FEEDBACK_KEY,
  OPENROUTER_GENERATED_SCRIPT_KEY,
  OPENROUTER_GENERATED_VARIANTS_KEY,
  OPENROUTER_ACTIVE_JOB_STORAGE_KEY,
  OPENROUTER_ACTIVE_JOBS_STORAGE_KEY,
] as const;

export type SupabaseSyncStatus = {
  enabled: boolean;
  state: 'disabled' | 'idle' | 'pulling' | 'pushing' | 'synced' | 'error';
  message: string;
  lastSyncedAt: string | null;
  imported: number;
  pushed: number;
};

export type ImmediateSessionSyncOptions = {
  localStorageSpanName?: string;
  buildSpanName?: string;
  pushingMessage?: string;
  syncedMessage?: string;
  errorMessage?: string;
  criticalSessionIds?: string[];
};

type PersistableSession = {
  id: string;
  updatedAt: string;
  status: string;
  telemetry: SessionTelemetry;
};

type UseSessionPersistenceSyncOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  sessions: TSession[];
  setSessions: Dispatch<SetStateAction<TSession[]>>;
  activeSessionId: string;
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  syncConfig: DictaSyncConfig;
  supabaseClient: SupabaseClient | null;
  effectiveProfileId: string;
  profileDisplayName?: string | null;
  adaptiveBenchmarks: TBenchmarks;
  setAdaptiveBenchmarks: Dispatch<SetStateAction<TBenchmarks>>;
  adaptiveBenchmarksRef: MutableRefObject<TBenchmarks>;
  adaptiveSessionFeedback: TFeedback;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<TFeedback>>;
  adaptiveSessionFeedbackRef: MutableRefObject<TFeedback>;
  loadSessions: () => TSession[];
  loadAdaptiveBenchmarks: () => TBenchmarks;
  loadAdaptiveSessionFeedback: () => TFeedback;
  normalizeSessionForPersistence: (session: TSession) => TSession;
  normalizeRestoredSession: (session: TSession) => TSession;
  buildSyncState: (sessions: TSession[], benchmarks: TBenchmarks, feedback: TFeedback) => DictaSyncState;
  onQuotaRecovered: (message: string) => void;
  onProfileStorageSwitched: () => void;
};

export type UseSessionPersistenceSyncResult<TSession extends PersistableSession, TFeedback> = {
  localStorageReadyForEffectiveProfile: boolean;
  supabaseInitialSyncPending: boolean;
  effectiveSyncConfig: DictaSyncConfig;
  supabaseSyncStatus: SupabaseSyncStatus;
  flushScheduledSessionPersist: (spanName?: string) => void;
  persistAndPushSessionsNow: (nextSessions: TSession[], options?: ImmediateSessionSyncOptions) => void;
  prependSessionAndPersistNow: (createNextSession: (previousSessions: TSession[]) => TSession) => TSession;
  persistAndPushAdaptiveSessionFeedbackNow: (nextFeedback: TFeedback) => void;
  deleteSessionAndSync: (sessionId: string) => void;
};

const SESSION_CREATE_SYNC_OPTIONS: ImmediateSessionSyncOptions = {
  localStorageSpanName: 'session.create.persistNow.localStorage',
  buildSpanName: 'supabase.buildSyncState.sessionCreate',
  pushingMessage: 'Pushing new session to Supabase...',
  syncedMessage: 'New session synced to Supabase.',
  errorMessage: 'Supabase session sync failed.',
};

export function useSessionPersistenceSync<TSession extends PersistableSession, TBenchmarks, TFeedback>({
  sessions,
  setSessions,
  activeSessionId,
  setActiveSessionId,
  syncConfig,
  supabaseClient,
  effectiveProfileId,
  profileDisplayName,
  adaptiveBenchmarks,
  setAdaptiveBenchmarks,
  adaptiveBenchmarksRef,
  adaptiveSessionFeedback,
  setAdaptiveSessionFeedback,
  adaptiveSessionFeedbackRef,
  loadSessions,
  loadAdaptiveBenchmarks,
  loadAdaptiveSessionFeedback,
  normalizeSessionForPersistence,
  normalizeRestoredSession,
  buildSyncState,
  onQuotaRecovered,
  onProfileStorageSwitched,
}: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>): UseSessionPersistenceSyncResult<TSession, TFeedback> {
  const [activeLocalSyncProfileId, setActiveLocalSyncProfileId] = useState(() =>
    readActiveSyncStorageProfileId(window.localStorage),
  );
  const localStorageReadyForEffectiveProfile =
    !syncConfig.authRequired || !effectiveProfileId || activeLocalSyncProfileId === effectiveProfileId;
  const effectiveSyncConfig = useMemo(
    () => ({
      ...syncConfig,
      enabled: Boolean(syncConfig.url && syncConfig.anonKey && effectiveProfileId && localStorageReadyForEffectiveProfile),
      profileId: effectiveProfileId,
    }),
    [syncConfig, effectiveProfileId, localStorageReadyForEffectiveProfile],
  );
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<SupabaseSyncStatus>({
    enabled: effectiveSyncConfig.enabled,
    state: effectiveSyncConfig.enabled ? 'idle' : 'disabled',
    message: effectiveSyncConfig.enabled ? 'Supabase sync ready.' : 'Sign in with Supabase Auth to enable cross-device sync.',
    lastSyncedAt: null,
    imported: 0,
    pushed: 0,
  });
  const supabaseSyncIdentity = effectiveSyncConfig.enabled ? effectiveSyncConfig.profileId : '';
  const [supabaseInitialPullState, setSupabaseInitialPullState] = useState(() => ({
    key: supabaseSyncIdentity,
    complete: !effectiveSyncConfig.enabled,
  }));
  const supabaseInitialSyncComplete =
    !effectiveSyncConfig.enabled ||
    (supabaseInitialPullState.key === supabaseSyncIdentity && supabaseInitialPullState.complete);
  const supabaseInitialSyncPending = effectiveSyncConfig.enabled && !supabaseInitialSyncComplete;

  const supabaseInitialPullCompleteRef = useRef(!effectiveSyncConfig.enabled);
  const supabaseApplyingRemoteRef = useRef(false);
  const latestSessionsForPersistenceRef = useRef<TSession[]>(sessions);
  const sessionPersistTimerRef = useRef<number | null>(null);
  const lastPersistedSessionsJsonRef = useRef<string | null>(null);
  const syncStateRef = useRef<DictaSyncState>(
    buildSyncState(sessions, adaptiveBenchmarks, adaptiveSessionFeedback),
  );
  const supabasePullInFlightRef = useRef(false);
  const supabaseKnownRemoteRowsRef = useRef<DictaSyncRow[]>([]);
  const supabaseLastRemoteUpdatedAtRef = useRef<string | null>(null);
  const supabaseLastFullPullAtMsRef = useRef(0);
  const deletedSessionIdsRef = useRef<Set<string>>(loadDeletedSessionIds());
  const supabaseInitialSyncPendingRef = useRef(supabaseInitialSyncPending);
  const supabaseAccessTokenRef = useRef<string>('');
  const pendingCriticalSessionRowsRef = useRef<DictaSyncRow[]>([]);

  useEffect(() => {
    supabaseInitialSyncPendingRef.current = supabaseInitialSyncPending;
  }, [supabaseInitialSyncPending]);

  useEffect(() => {
    supabaseAccessTokenRef.current = '';
    if (!supabaseClient || !effectiveSyncConfig.enabled) return;

    const auth = supabaseClient.auth;
    if (!auth?.getSession || !auth?.onAuthStateChange) return;
    let cancelled = false;
    void auth.getSession().then(({ data }) => {
      if (!cancelled) {
        supabaseAccessTokenRef.current = data.session?.access_token ?? '';
      }
    });

    const { data } = auth.onAuthStateChange((_event, session) => {
      supabaseAccessTokenRef.current = session?.access_token ?? '';
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [effectiveSyncConfig.enabled, supabaseClient, supabaseSyncIdentity]);

  const clearScheduledSessionPersist = useCallback((): void => {
    if (sessionPersistTimerRef.current === null) return;
    window.clearTimeout(sessionPersistTimerRef.current);
    sessionPersistTimerRef.current = null;
  }, []);

  const buildQuotaRecoverySessions = useCallback((nextSessions: TSession[]): TSession[] => {
    const sortedSessions = [...nextSessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const recoverySessions = sortedSessions.filter(
      (session, index) => index < SESSION_PERSIST_RECOVERY_MAX_SESSIONS || session.id === activeSessionId,
    );

    return recoverySessions.map((session, index) => {
      const normalized = normalizeSessionForPersistence(session);
      const keepFullTelemetry =
        session.id === activeSessionId ||
        index < SESSION_PERSIST_RECOVERY_FULL_TELEMETRY_SESSIONS ||
        session.status === 'running' ||
        session.status === 'paused';

      return keepFullTelemetry
        ? normalized
        : {
            ...normalized,
            telemetry: compactTelemetryForStorage(normalized.telemetry),
          };
    });
  }, [activeSessionId, normalizeSessionForPersistence]);

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

        const recoveryJson = JSON.stringify(buildQuotaRecoverySessions(nextSessions));
        window.localStorage.setItem(SESSION_STORAGE_KEY, recoveryJson);
        lastPersistedSessionsJsonRef.current = recoveryJson;
        onQuotaRecovered('Local session storage was full. Dicta compacted older session telemetry so the current session can keep saving.');
      }
    }, { sessionCount: nextSessions.length });
  }, [buildQuotaRecoverySessions, normalizeSessionForPersistence, onQuotaRecovered]);

  const clearPendingCriticalSessionRows = useCallback((sessionIds: string[]): void => {
    if (sessionIds.length === 0 || pendingCriticalSessionRowsRef.current.length === 0) return;
    const ids = new Set(sessionIds);
    pendingCriticalSessionRowsRef.current = pendingCriticalSessionRowsRef.current.filter(
      (row) => row.item_type !== 'session' || !ids.has(row.item_key),
    );
  }, []);

  const rememberPendingCriticalSessionRows = useCallback((syncState: DictaSyncState, sessionIds: string[]): void => {
    if (!effectiveSyncConfig.enabled || sessionIds.length === 0) return;
    const ids = new Set(sessionIds.filter(Boolean));
    if (ids.size === 0) return;
    const rows = toSyncRows(effectiveSyncConfig.profileId, buildSyncItems(syncState)).filter(
      (row) => row.item_type === 'session' && ids.has(row.item_key),
    );
    pendingCriticalSessionRowsRef.current = mergeSyncRowSnapshots(pendingCriticalSessionRowsRef.current, rows);
  }, [effectiveSyncConfig.enabled, effectiveSyncConfig.profileId]);

  const flushPendingCriticalSessionRowsKeepalive = useCallback((): void => {
    if (!effectiveSyncConfig.enabled || pendingCriticalSessionRowsRef.current.length === 0) return;
    const accessToken = supabaseAccessTokenRef.current;
    if (!effectiveSyncConfig.url || !effectiveSyncConfig.anonKey || !accessToken) return;

    const rows = selectPushableSyncRows(pendingCriticalSessionRowsRef.current, supabaseKnownRemoteRowsRef.current);
    if (rows.length === 0) {
      pendingCriticalSessionRowsRef.current = [];
      return;
    }

    const body = JSON.stringify(rows);
    if (byteSize(body) > SUPABASE_KEEPALIVE_BODY_MAX_BYTES) return;

    const endpoint = `${effectiveSyncConfig.url.replace(/\/+$/, '')}/rest/v1/${DICTA_SYNC_TABLE}?on_conflict=profile_id,item_type,item_key`;
    try {
      void fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: effectiveSyncConfig.anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body,
      });
    } catch {
      // The normal Supabase retry path will run on the next visible/online sync cycle.
    }
  }, [effectiveSyncConfig.anonKey, effectiveSyncConfig.enabled, effectiveSyncConfig.url]);

  const flushScheduledSessionPersist = useCallback((spanName = 'session.localStorage.flush'): void => {
    clearScheduledSessionPersist();
    if (supabaseInitialSyncPendingRef.current) return;
    persistSessionsToLocalStorage(latestSessionsForPersistenceRef.current, spanName);
  }, [clearScheduledSessionPersist, persistSessionsToLocalStorage]);

  const persistAndPushSessionsNow = useCallback((nextSessions: TSession[], options: ImmediateSessionSyncOptions = {}): void => {
    const {
      localStorageSpanName = 'session.persistNow.localStorage',
      buildSpanName = 'supabase.buildSyncState.final',
      pushingMessage = 'Pushing final session to Supabase...',
      syncedMessage = 'Final session synced to Supabase.',
      errorMessage = 'Supabase sync failed.',
      criticalSessionIds = [],
    } = options;
    latestSessionsForPersistenceRef.current = nextSessions;
    clearScheduledSessionPersist();
    persistSessionsToLocalStorage(nextSessions, localStorageSpanName);

    let syncState: DictaSyncState | null = null;
    if (supabaseClient && effectiveSyncConfig.enabled) {
      syncState = perfDiagnostics.withSpan(buildSpanName, () =>
        buildSyncState(nextSessions, adaptiveBenchmarks, adaptiveSessionFeedback),
      );
      syncStateRef.current = syncState;
      rememberPendingCriticalSessionRows(syncState, criticalSessionIds);
    }

    if (!supabaseClient || !effectiveSyncConfig.enabled || !syncState || !supabaseInitialPullCompleteRef.current || supabaseApplyingRemoteRef.current) return;

    setSupabaseSyncStatus((current) => ({
      ...current,
      state: 'pushing',
      message: pushingMessage,
    }));
    void pushSyncRowsDetailed(supabaseClient, effectiveSyncConfig.profileId, syncState, {
      existingRows: supabaseKnownRemoteRowsRef.current,
    })
      .then(({ pushed, pushedRows }) => {
        supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, pushedRows);
        supabaseLastRemoteUpdatedAtRef.current =
          latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
        clearPendingCriticalSessionRows(criticalSessionIds);
        setSupabaseSyncStatus((current) => ({
          ...current,
          state: 'synced',
          message: syncedMessage,
          lastSyncedAt: new Date().toISOString(),
          pushed,
        }));
      })
      .catch((error) => {
        setSupabaseSyncStatus((current) => ({
          ...current,
          state: 'error',
          message: error instanceof Error ? error.message : errorMessage,
        }));
      });
  }, [
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    buildSyncState,
    clearPendingCriticalSessionRows,
    clearScheduledSessionPersist,
    effectiveSyncConfig.enabled,
    effectiveSyncConfig.profileId,
    persistSessionsToLocalStorage,
    rememberPendingCriticalSessionRows,
    supabaseClient,
  ]);

  const prependSessionAndPersistNow = useCallback((createNextSession: (previousSessions: TSession[]) => TSession): TSession => {
    const previousSessions = latestSessionsForPersistenceRef.current;
    const nextSession = createNextSession(previousSessions);
    const nextSessions = [nextSession, ...previousSessions];
    setSessions(nextSessions);
    persistAndPushSessionsNow(nextSessions, SESSION_CREATE_SYNC_OPTIONS);
    return nextSession;
  }, [persistAndPushSessionsNow, setSessions]);

  const persistAndPushAdaptiveSessionFeedbackNow = useCallback((nextFeedback: TFeedback): void => {
    adaptiveSessionFeedbackRef.current = nextFeedback;
    window.localStorage.setItem(ADAPTIVE_SESSION_FEEDBACK_KEY, JSON.stringify(nextFeedback));
    const syncState = perfDiagnostics.withSpan('supabase.buildSyncState.feedbackFinal', () =>
      buildSyncState(latestSessionsForPersistenceRef.current, adaptiveBenchmarksRef.current, nextFeedback),
    );
    syncStateRef.current = syncState;
    if (!supabaseClient || !effectiveSyncConfig.enabled || !supabaseInitialPullCompleteRef.current || supabaseApplyingRemoteRef.current) return;

    setSupabaseSyncStatus((current) => ({
      ...current,
      state: 'pushing',
      message: 'Pushing completed session feedback to Supabase...',
    }));
    void pushSyncRowsDetailed(supabaseClient, effectiveSyncConfig.profileId, syncState, {
      existingRows: supabaseKnownRemoteRowsRef.current,
    })
      .then(({ pushed, pushedRows }) => {
        supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, pushedRows);
        supabaseLastRemoteUpdatedAtRef.current =
          latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
        setSupabaseSyncStatus((current) => ({
          ...current,
          state: 'synced',
          message: 'Completed session feedback synced to Supabase.',
          lastSyncedAt: new Date().toISOString(),
          pushed,
        }));
      })
      .catch((error) => {
        setSupabaseSyncStatus((current) => ({
          ...current,
          state: 'error',
          message: error instanceof Error ? error.message : 'Supabase feedback sync failed.',
        }));
      });
  }, [
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackRef,
    buildSyncState,
    effectiveSyncConfig.enabled,
    effectiveSyncConfig.profileId,
    supabaseClient,
  ]);

  const deleteSessionAndSync = useCallback((sessionId: string): void => {
    deletedSessionIdsRef.current.add(sessionId);
    persistDeletedSessionIds(deletedSessionIdsRef.current);
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    if (supabaseClient && effectiveSyncConfig.enabled) {
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'pushing',
        message: 'Deleting session in Supabase...',
      }));
      void deleteSessionSyncRow(supabaseClient, effectiveSyncConfig.profileId, sessionId)
        .then((deletedRow) => {
          supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, [deletedRow]);
          supabaseLastRemoteUpdatedAtRef.current =
            latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
          setSupabaseSyncStatus((current) => ({
            ...current,
            state: 'synced',
            message: 'Session deleted and synced.',
            lastSyncedAt: new Date().toISOString(),
          }));
        })
        .catch((error) => {
          setSupabaseSyncStatus((current) => ({
            ...current,
            state: 'error',
            message: error instanceof Error ? error.message : 'Failed to delete session in Supabase.',
          }));
        });
    }
  }, [effectiveSyncConfig.enabled, effectiveSyncConfig.profileId, setSessions, supabaseClient]);

  useEffect(() => {
    if (!syncConfig.authRequired) return;

    const result = switchProfileScopedStorage(window.localStorage, PROFILE_SCOPED_DICTA_STORAGE_KEYS, effectiveProfileId);
    if (!result.changed) {
      if (activeLocalSyncProfileId !== result.activeProfileId) {
        setActiveLocalSyncProfileId(result.activeProfileId);
      }
      return;
    }

    setActiveLocalSyncProfileId(result.activeProfileId);
    clearScheduledSessionPersist();

    const restoredSessions = loadSessions();
    latestSessionsForPersistenceRef.current = restoredSessions;
    lastPersistedSessionsJsonRef.current = null;
    setSessions(restoredSessions);
    setActiveSessionId(restoredSessions[0]?.id ?? '');
    onProfileStorageSwitched();

    const restoredBenchmarks = loadAdaptiveBenchmarks();
    adaptiveBenchmarksRef.current = restoredBenchmarks;
    setAdaptiveBenchmarks(restoredBenchmarks);

    const restoredFeedback = loadAdaptiveSessionFeedback();
    adaptiveSessionFeedbackRef.current = restoredFeedback;
    setAdaptiveSessionFeedback(restoredFeedback);

    deletedSessionIdsRef.current = loadDeletedSessionIds();
    syncStateRef.current = buildSyncState(restoredSessions, restoredBenchmarks, restoredFeedback);
    supabaseApplyingRemoteRef.current = false;
    supabaseInitialPullCompleteRef.current = !result.activeProfileId;
    setSupabaseInitialPullState({
      key: result.activeProfileId,
      complete: !result.activeProfileId,
    });
    supabasePullInFlightRef.current = false;
    supabaseKnownRemoteRowsRef.current = [];
    supabaseLastRemoteUpdatedAtRef.current = null;
    supabaseLastFullPullAtMsRef.current = 0;
    pendingCriticalSessionRowsRef.current = [];
  }, [
    activeLocalSyncProfileId,
    adaptiveBenchmarksRef,
    adaptiveSessionFeedbackRef,
    buildSyncState,
    clearScheduledSessionPersist,
    effectiveProfileId,
    loadAdaptiveBenchmarks,
    loadAdaptiveSessionFeedback,
    loadSessions,
    onProfileStorageSwitched,
    setActiveSessionId,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
    setSessions,
    syncConfig.authRequired,
  ]);

  useEffect(() => {
    supabaseInitialPullCompleteRef.current = !effectiveSyncConfig.enabled;
    setSupabaseInitialPullState({
      key: supabaseSyncIdentity,
      complete: !effectiveSyncConfig.enabled,
    });
    supabaseKnownRemoteRowsRef.current = [];
    supabaseLastRemoteUpdatedAtRef.current = null;
    supabaseLastFullPullAtMsRef.current = 0;
    pendingCriticalSessionRowsRef.current = [];
    setSupabaseSyncStatus({
      enabled: effectiveSyncConfig.enabled,
      state: effectiveSyncConfig.enabled ? 'idle' : 'disabled',
      message: effectiveSyncConfig.enabled
        ? `Supabase sync ready for ${profileDisplayName ?? effectiveSyncConfig.profileId}.`
        : syncConfig.authRequired
          ? 'Sign in with Supabase Auth to enable cross-device sync.'
          : 'Set Supabase env vars to enable cross-device sync.',
      lastSyncedAt: null,
      imported: 0,
      pushed: 0,
    });
  }, [profileDisplayName, effectiveSyncConfig.enabled, effectiveSyncConfig.profileId, supabaseSyncIdentity, syncConfig.authRequired]);

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
  }, [clearScheduledSessionPersist, localStorageReadyForEffectiveProfile, persistSessionsToLocalStorage, sessions, supabaseInitialSyncPending]);

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

  useEffect(() => {
    syncStateRef.current = buildSyncState(sessions, adaptiveBenchmarks, adaptiveSessionFeedback);
  }, [adaptiveBenchmarks, adaptiveSessionFeedback, buildSyncState, sessions]);

  useEffect(() => {
    if (!supabaseClient || !effectiveSyncConfig.enabled) return;
    const client = supabaseClient;
    let cancelled = false;

    async function pullAndMergeSync(reason: 'initial' | 'background'): Promise<void> {
      if (supabasePullInFlightRef.current) return;
      supabasePullInFlightRef.current = true;
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'pulling',
        message: reason === 'initial' ? 'Pulling Supabase sync data...' : 'Refreshing Supabase sync data...',
      }));
      try {
        const shouldFullPull = reason === 'initial' || Date.now() - supabaseLastFullPullAtMsRef.current > 60 * 60_000;
        const rows = await pullSyncRows(client, effectiveSyncConfig.profileId, {
          updatedAfter: shouldFullPull ? null : supabaseLastRemoteUpdatedAtRef.current,
        });
        if (cancelled) return;
        if (shouldFullPull) {
          supabaseLastFullPullAtMsRef.current = Date.now();
        }
        supabaseKnownRemoteRowsRef.current = shouldFullPull ? rows : mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, rows);
        supabaseLastRemoteUpdatedAtRef.current =
          latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
        const transientErrorSessionIds = rows
          .filter((row) => row.item_type === 'session' && isTransientGenerationErrorSessionLike(row.payload))
          .map((row) => row.item_key);
        if (transientErrorSessionIds.length > 0) {
          transientErrorSessionIds.forEach((sessionId) => deletedSessionIdsRef.current.add(sessionId));
          persistDeletedSessionIds(deletedSessionIdsRef.current);
          void Promise.allSettled(transientErrorSessionIds.map((sessionId) => deleteSessionSyncRow(client, effectiveSyncConfig.profileId, sessionId)));
        }
        const merged = mergeSyncRows(syncStateRef.current, rows);
        if (merged.deletedSessionIds.length > 0) {
          merged.deletedSessionIds.forEach((sessionId) => deletedSessionIdsRef.current.add(sessionId));
          persistDeletedSessionIds(deletedSessionIdsRef.current);
        }
        const filteredMergedSessions = (merged.sessions as TSession[]).map(normalizeRestoredSession).filter(
          (session) => !deletedSessionIdsRef.current.has(session.id) && !isTransientGenerationErrorSessionLike(session),
        );
        if (merged.changed || filteredMergedSessions.length !== (merged.sessions as TSession[]).length) {
          supabaseApplyingRemoteRef.current = true;
          setSessions(filteredMergedSessions);
          setAdaptiveBenchmarks(merged.benchmarks as TBenchmarks);
          setAdaptiveSessionFeedback(merged.feedback as TFeedback);
          window.setTimeout(() => {
            supabaseApplyingRemoteRef.current = false;
          }, 0);
        }
        supabaseInitialPullCompleteRef.current = true;
        setSupabaseInitialPullState({
          key: supabaseSyncIdentity,
          complete: true,
        });

        const postMergeState = {
          ...merged,
          sessions: filteredMergedSessions,
        };
        const { pushed, pushedRows } = await pushSyncRowsDetailed(client, effectiveSyncConfig.profileId, postMergeState, {
          existingRows: supabaseKnownRemoteRowsRef.current,
        });
        supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, pushedRows);
        supabaseLastRemoteUpdatedAtRef.current =
          latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
        clearPendingCriticalSessionRows((postMergeState.sessions as TSession[]).map((session) => session.id));
        if (cancelled) return;
        setSupabaseSyncStatus({
          enabled: true,
          state: 'synced',
          message: merged.imported > 0 ? `Synced. Imported ${merged.imported} remote item${merged.imported === 1 ? '' : 's'}.` : 'Synced with Supabase.',
          lastSyncedAt: new Date().toISOString(),
          imported: merged.imported,
          pushed,
        });
      } catch (error) {
        if (cancelled) return;
        supabaseInitialPullCompleteRef.current = true;
        setSupabaseInitialPullState({
          key: supabaseSyncIdentity,
          complete: true,
        });
        setSupabaseSyncStatus((current) => ({
          ...current,
          state: 'error',
          message: error instanceof Error ? error.message : 'Supabase sync failed.',
        }));
      } finally {
        supabasePullInFlightRef.current = false;
      }
    }

    void pullAndMergeSync('initial');

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void pullAndMergeSync('background');
    }, SUPABASE_BACKGROUND_PULL_INTERVAL_MS);

    const onFocus = () => {
      void pullAndMergeSync('background');
    };
    const onOnline = () => {
      void pullAndMergeSync('background');
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pullAndMergeSync('background');
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [
    effectiveSyncConfig.enabled,
    effectiveSyncConfig.profileId,
    normalizeRestoredSession,
    clearPendingCriticalSessionRows,
    setAdaptiveBenchmarks,
    setAdaptiveSessionFeedback,
    setSessions,
    supabaseSyncIdentity,
    supabaseClient,
  ]);

  useEffect(() => {
    if (!supabaseClient || !effectiveSyncConfig.enabled || !supabaseInitialPullCompleteRef.current || supabaseApplyingRemoteRef.current) return;

    const timeout = window.setTimeout(() => {
      setSupabaseSyncStatus((current) => ({
        ...current,
        state: 'pushing',
        message: 'Pushing local changes to Supabase...',
      }));
      const syncState = perfDiagnostics.withSpan('supabase.buildSyncState.background', () =>
        buildSyncState(sessions, adaptiveBenchmarks, adaptiveSessionFeedback),
      );
      pushSyncRowsDetailed(supabaseClient, effectiveSyncConfig.profileId, syncState, {
        existingRows: supabaseKnownRemoteRowsRef.current,
      })
        .then(({ pushed, pushedRows }) => {
          supabaseKnownRemoteRowsRef.current = mergeSyncRowSnapshots(supabaseKnownRemoteRowsRef.current, pushedRows);
          supabaseLastRemoteUpdatedAtRef.current =
            latestSyncRowTimestamp(supabaseKnownRemoteRowsRef.current) ?? supabaseLastRemoteUpdatedAtRef.current;
          clearPendingCriticalSessionRows(sessions.map((session) => session.id));
          setSupabaseSyncStatus((current) => ({
            ...current,
            state: 'synced',
            message: 'Local changes synced to Supabase.',
            lastSyncedAt: new Date().toISOString(),
            pushed,
          }));
        })
        .catch((error) => {
          setSupabaseSyncStatus((current) => ({
            ...current,
            state: 'error',
            message: error instanceof Error ? error.message : 'Supabase sync failed.',
          }));
        });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [
    adaptiveBenchmarks,
    adaptiveSessionFeedback,
    buildSyncState,
    clearPendingCriticalSessionRows,
    effectiveSyncConfig.enabled,
    effectiveSyncConfig.profileId,
    sessions,
    supabaseClient,
  ]);

  return {
    localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending,
    effectiveSyncConfig,
    supabaseSyncStatus,
    flushScheduledSessionPersist,
    persistAndPushSessionsNow,
    prependSessionAndPersistNow,
    persistAndPushAdaptiveSessionFeedbackNow,
    deleteSessionAndSync,
  };
}

export function loadDeletedSessionIds(storage: Storage = window.localStorage): Set<string> {
  const raw = storage.getItem(DELETED_SESSION_IDS_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === 'string' && value.length > 0));
  } catch {
    return new Set();
  }
}

export function persistDeletedSessionIds(ids: Set<string>, storage: Storage = window.localStorage): void {
  const normalized = [...ids].filter(Boolean).slice(-600);
  storage.setItem(DELETED_SESSION_IDS_KEY, JSON.stringify(normalized));
}

function isLocalStorageQuotaExceeded(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    candidate.code === 22 ||
    candidate.code === 1014
  );
}

function byteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}
