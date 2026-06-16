import { useRef } from 'react';
import { useSessionPersistenceRuntime } from './useSessionPersistenceRuntime';

type SessionPersistenceRuntimeOptions = Parameters<typeof useSessionPersistenceRuntime>[0];

type UseDictaRootPersistenceRuntimeOptions = Omit<
  SessionPersistenceRuntimeOptions,
  'resetOpenRouterJobsRuntime'
>;

export function useDictaRootPersistenceRuntime(options: UseDictaRootPersistenceRuntimeOptions) {
  const resetOpenRouterJobsRuntimeRef = useRef<() => void>(() => undefined);
  const persistenceRuntime = useSessionPersistenceRuntime({
    ...options,
    resetOpenRouterJobsRuntime: () => resetOpenRouterJobsRuntimeRef.current(),
  });

  return {
    ...persistenceRuntime,
    resetOpenRouterJobsRuntimeRef,
  };
}
