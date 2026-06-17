import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DictaSyncRow, DictaSyncState } from '../../core/supabaseSync';
import type { PersistableSession, SupabaseSyncStatus } from './sessionPersistenceSyncTypes';

export type SupabaseRemoteRowsRefs = {
  supabaseKnownRemoteRowsRef: MutableRefObject<DictaSyncRow[]>;
  supabaseLastRemoteUpdatedAtRef: MutableRefObject<string | null>;
};

export type PushSyncStateToSupabaseOptions = SupabaseRemoteRowsRefs & {
  supabaseClient: SupabaseClient;
  profileId: string;
  syncState: DictaSyncState;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
  pushingMessage: string;
  syncedMessage: string;
  errorMessage: string;
  clearPendingSessionIds?: string[];
  clearPendingCriticalSessionRows?: (sessionIds: string[]) => void;
  setPushingStatus?: boolean;
};

export type DeleteSessionSyncFromSupabaseOptions = SupabaseRemoteRowsRefs & {
  supabaseClient: SupabaseClient;
  profileId: string;
  sessionId: string;
  setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
};

export type UseSupabaseBackgroundPushOptions<TSession extends PersistableSession, TBenchmarks, TFeedback> =
  SupabaseRemoteRowsRefs & {
    supabaseClient: SupabaseClient | null;
    syncEnabled: boolean;
    profileId: string;
    sessions: TSession[];
    adaptiveBenchmarks: TBenchmarks;
    adaptiveSessionFeedback: TFeedback;
    buildSyncState: (sessions: TSession[], benchmarks: TBenchmarks, feedback: TFeedback) => DictaSyncState;
    supabaseInitialPullCompleteRef: MutableRefObject<boolean>;
    supabaseApplyingRemoteRef: MutableRefObject<boolean>;
    clearPendingCriticalSessionRows: (sessionIds: string[]) => void;
    setSupabaseSyncStatus: Dispatch<SetStateAction<SupabaseSyncStatus>>;
  };
