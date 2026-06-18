import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DictaSyncRow, DictaSyncState } from '../../core/supabaseSync';
import type {
  PersistableSession,
  SupabaseInitialPullState,
  SupabaseSyncStatus,
} from './sessionPersistenceSyncTypes';
import type { SessionPersistenceLocalPayloadStore } from './sessionPersistenceLocalPayloadStore';

export type UseSupabaseSessionPullRuntimeOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  supabaseClient: SupabaseClient | null;
  syncEnabled: boolean;
  profileId: string;
  localPayloadProfileId: string;
  localPayloadStore?: SessionPersistenceLocalPayloadStore<TSession, TBenchmarks, TFeedback>;
  supabaseSyncIdentity: string;
  normalizeRestoredSession: (session: TSession) => TSession;
  setSessions: Dispatch<SetStateAction<TSession[]>>;
  setAdaptiveBenchmarks: Dispatch<SetStateAction<TBenchmarks>>;
  setAdaptiveSessionFeedback: Dispatch<SetStateAction<TFeedback>>;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
  setSupabaseInitialPullState: Dispatch<SetStateAction<SupabaseInitialPullState>>;
  syncStateRef: MutableRefObject<DictaSyncState>;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  supabasePullInFlightRef: MutableRefObject<boolean>;
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
  supabaseLastFullPullAtMsRef: MutableRefObject<number>;
  supabaseApplyingRemoteRef: MutableRefObject<boolean>;
  supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
  clearPendingCriticalSessionRows: (sessionIds: string[]) => void;
  pruneAdaptiveSessionFeedbackForDeletedSessions?: (
    feedback: TFeedback,
    sessionIds: ReadonlySet<string>,
  ) => TFeedback;
};
