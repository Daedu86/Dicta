import { useSessionPersistenceCoreRuntime } from './useSessionPersistenceCoreRuntime';
import { useSessionPersistenceDataLifecycle } from './useSessionPersistenceDataLifecycle';
import { useSessionPersistenceProfileLifecycle } from './useSessionPersistenceProfileLifecycle';
import type {
  PersistableSession,
  UseSessionPersistenceSyncOptions,
  UseSessionPersistenceSyncResult,
} from './sessionPersistenceSyncTypes';

export function useSessionPersistenceSync<TSession extends PersistableSession, TBenchmarks, TFeedback>(
  options: UseSessionPersistenceSyncOptions<TSession, TBenchmarks, TFeedback>,
): UseSessionPersistenceSyncResult<TSession, TFeedback> {
  const core = useSessionPersistenceCoreRuntime(options);

  useSessionPersistenceProfileLifecycle({ options, core });
  useSessionPersistenceDataLifecycle({ options, core });

  return {
    localStorageReadyForEffectiveProfile: core.state.localStorageReadyForEffectiveProfile,
    supabaseInitialSyncPending: core.state.supabaseInitialSyncPending,
    effectiveSyncConfig: core.state.effectiveSyncConfig,
    supabaseSyncStatus: core.state.supabaseSyncStatus,
    flushScheduledSessionPersist: core.local.flushScheduledSessionPersist,
    ...core.actions,
  };
}
