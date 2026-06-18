import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionTelemetry } from '../../types/dictation';
import type { DictaSyncConfig, DictaSyncState } from '../../core/supabaseSync';

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

export type PersistableSession = {
  id: string;
  createdAt?: string;
  updatedAt: string;
  status: string;
  telemetry: SessionTelemetry;
};

export type SupabaseInitialPullState = {
  key: string;
  complete: boolean;
};

export type UseSessionPersistenceSyncOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
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
  pruneAdaptiveSessionFeedbackForDeletedSessions?: (
    feedback: TFeedback,
    sessionIds: ReadonlySet<string>,
  ) => TFeedback;
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
