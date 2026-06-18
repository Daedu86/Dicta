import type { PersistableSession } from './sessionPersistenceSyncTypes';
import {
  loadAdaptiveBenchmarks as loadAdaptiveBenchmarksFromIndexedDb,
  saveAdaptiveBenchmarks as saveAdaptiveBenchmarksToIndexedDb,
} from '../../core/localDb/adaptiveBenchmarkLocalStore';
import {
  loadAdaptiveSessionFeedback as loadAdaptiveSessionFeedbackFromIndexedDb,
  saveAdaptiveSessionFeedback as saveAdaptiveSessionFeedbackToIndexedDb,
} from '../../core/localDb/adaptiveFeedbackLocalStore';
import { migrateLegacyLocalStorageToIndexedDb } from '../../core/localDb/migrateLegacyLocalStorage';
import {
  deleteSession as deleteSessionFromIndexedDb,
  loadDeletedSessionIds as loadDeletedSessionIdsFromIndexedDb,
  loadSessions as loadSessionsFromIndexedDb,
  saveDeletedSessionIds as saveDeletedSessionIdsToIndexedDb,
  saveSessions as saveSessionsToIndexedDb,
} from '../../core/localDb/sessionLocalStore';

export const LOCAL_ONLY_LOCAL_DB_PROFILE_ID = 'legacy-local';

export type LocalPayloadHydrationResult<TSession, TBenchmarks, TFeedback> = {
  sessions: TSession[];
  benchmarks: TBenchmarks;
  feedback: TFeedback;
  deletedSessionIds: Set<string>;
};

export type SessionPersistenceLocalPayloadStore<TSession extends PersistableSession, TBenchmarks, TFeedback> = {
  migrateAndLoad: (profileId: string) => Promise<LocalPayloadHydrationResult<TSession, TBenchmarks, TFeedback>>;
  saveSessions: (profileId: string, sessions: readonly TSession[]) => Promise<void>;
  saveAdaptiveBenchmarks: (profileId: string, benchmarks: TBenchmarks) => Promise<void>;
  saveAdaptiveSessionFeedback: (profileId: string, feedback: TFeedback) => Promise<void>;
  saveDeletedSessionIds: (profileId: string, deletedSessionIds: ReadonlySet<string>) => Promise<void>;
  deleteSession: (profileId: string, sessionId: string) => Promise<void>;
};

export function createIndexedDbLocalPayloadStore<
  TSession extends PersistableSession,
  TBenchmarks extends object,
  TFeedback extends object,
>(): SessionPersistenceLocalPayloadStore<TSession, TBenchmarks, TFeedback> {
  return {
    migrateAndLoad: async (profileId) => {
      await migrateLegacyLocalStorageToIndexedDb({ profileId });
      const [sessions, benchmarks, feedback, deletedSessionIds] = await Promise.all([
        loadSessionsFromIndexedDb<TSession>(profileId),
        loadAdaptiveBenchmarksFromIndexedDb<TBenchmarks>(profileId),
        loadAdaptiveSessionFeedbackFromIndexedDb<TFeedback>(profileId),
        loadDeletedSessionIdsFromIndexedDb(profileId),
      ]);
      return { sessions, benchmarks, feedback, deletedSessionIds };
    },
    saveSessions: saveSessionsToIndexedDb,
    saveAdaptiveBenchmarks: saveAdaptiveBenchmarksToIndexedDb,
    saveAdaptiveSessionFeedback: saveAdaptiveSessionFeedbackToIndexedDb,
    saveDeletedSessionIds: saveDeletedSessionIdsToIndexedDb,
    deleteSession: deleteSessionFromIndexedDb,
  };
}

export function resolveLocalPayloadProfileId(profileId: string): string {
  return profileId.trim() || LOCAL_ONLY_LOCAL_DB_PROFILE_ID;
}
