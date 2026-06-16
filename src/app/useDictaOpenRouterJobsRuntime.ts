import type { MutableRefObject } from 'react';
import { useOpenRouterErrorSessionActions } from './useOpenRouterErrorSessionActions';
import { useOpenRouterGeneratedScriptSettlement } from './useOpenRouterGeneratedScriptSettlement';
import { useOpenRouterJobsRuntime } from './useOpenRouterJobsRuntime';

export type UseDictaOpenRouterJobsRuntimeOptions = {
  errorSessionActions: Parameters<typeof useOpenRouterErrorSessionActions>[0];
  generatedScriptSettlement: Parameters<typeof useOpenRouterGeneratedScriptSettlement>[0];
  jobs: Omit<
    Parameters<typeof useOpenRouterJobsRuntime>[0],
    'onCreateGenerationErrorSession' | 'onGeneratedScript'
  >;
  resetOpenRouterJobsRuntimeRef: MutableRefObject<() => void>;
};

export function useDictaOpenRouterJobsRuntime({
  errorSessionActions,
  generatedScriptSettlement,
  jobs,
  resetOpenRouterJobsRuntimeRef,
}: UseDictaOpenRouterJobsRuntimeOptions) {
  const {
    createOpenRouterErrorSession,
    createCustomOpenRouterErrorSessionForJob,
  } = useOpenRouterErrorSessionActions(errorSessionActions);

  const settleOpenRouterGeneratedScript = useOpenRouterGeneratedScriptSettlement(generatedScriptSettlement);

  const jobsRuntime = useOpenRouterJobsRuntime({
    ...jobs,
    onCreateGenerationErrorSession: createCustomOpenRouterErrorSessionForJob,
    onGeneratedScript: settleOpenRouterGeneratedScript,
  });

  resetOpenRouterJobsRuntimeRef.current = jobsRuntime.resetOpenRouterJobsRuntime;

  return {
    createOpenRouterErrorSession,
    ...jobsRuntime,
  };
}
