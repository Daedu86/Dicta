import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DictaSyncRow, DictaSyncState } from '../../core/supabaseSync';
import type {
  PersistableSession,
  SupabaseSyncStatus,
  UseSessionPersistenceSyncResult,
} from './sessionPersistenceSyncTypes';
import type { SessionPersistenceLocalPayloadStore } from './sessionPersistenceLocalPayloadStore';

export type SessionPersistenceSyncActions<TSession extends PersistableSession, TFeedback> = Pick<
  UseSessionPersistenceSyncResult<TSession, TFeedback>,
  'persistAndPushSessionsNow' | 'prependSessionAndPersistNow' | 'persistAndPushAdaptiveSessionFeedbackNow' | 'deleteSessionAndSync'
>;

export type UseSessionPersistenceSyncActionsOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  supabaseClient: SupabaseClient | null;
  syncEnabled: boolean;
  profileId: string;
  setSessions: Dispatch<SetStateAction<TSession[]>>;
  adaptiveBenchmarks: TBenchmarks;
  adaptiveBenchmarksRef: MutableRefObject<TBenchmarks>;
  adaptiveSessionFeedback: TFeedback;
  adaptiveSessionFeedbackRef: MutableRefObject<TFeedback>;
  buildSyncState: (sessions: TSession[], benchmarks: TBenchmarks, feedback: TFeedback) => DictaSyncState;
  latestSessionsForPersistenceRef: MutableRefObject<TSession[]>;
  clearScheduledSessionPersist: () => void;
  persistSessionsToLocalStorage: (nextSessions: TSession[], spanName?: string) => void;
  localPayloadProfileId: string;
  localPayloadStore?: SessionPersistenceLocalPayloadStore<TSession, TBenchmarks, TFeedback>;
  syncStateRef: MutableRefObject<DictaSyncState>;
  supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
  supabaseApplyingRemoteRef: MutableRefObject<boolean>;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
  rememberPendingCriticalSessionRows: (syncState: DictaSyncState, sessionIds: string[]) => void;
  clearPendingCriticalSessionRows: (sessionIds: string[]) => void;
};
