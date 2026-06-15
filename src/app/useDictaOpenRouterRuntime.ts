import type { MutableRefObject } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useOpenRouterErrorSessionActions } from './useOpenRouterErrorSessionActions';
import { useOpenRouterGeneratedScriptSettlement } from './useOpenRouterGeneratedScriptSettlement';
import { useOpenRouterGenerationRuntime } from './useOpenRouterGenerationRuntime';
import { useOpenRouterJobsRuntime } from './useOpenRouterJobsRuntime';

type OpenRouterGenerationRuntimeOptions = Parameters<typeof useOpenRouterGenerationRuntime>[0];

type UseDictaOpenRouterRuntimeOptions = {
  errorSessionActions: Parameters<typeof useOpenRouterErrorSessionActions>[0];
  generatedScriptSettlement: Parameters<typeof useOpenRouterGeneratedScriptSettlement>[0];
  jobs: Omit<
    Parameters<typeof useOpenRouterJobsRuntime>[0],
    'onCreateGenerationErrorSession' | 'onGeneratedScript'
  >;
  generation: Omit<OpenRouterGenerationRuntimeOptions, 'access' | 'jobActions'> & {
    access: Omit<OpenRouterGenerationRuntimeOptions['access'], 'isOnline'>;
  };
  resetOpenRouterJobsRuntimeRef: MutableRefObject<() => void>;
};

export function useDictaOpenRouterRuntime({
  errorSessionActions,
  generatedScriptSettlement,
  jobs,
  generation,
  resetOpenRouterJobsRuntimeRef,
}: UseDictaOpenRouterRuntimeOptions) {
  const {
    createOpenRouterErrorSession,
    createCustomOpenRouterErrorSessionForJob,
  } = useOpenRouterErrorSessionActions(errorSessionActions);

  const settleOpenRouterGeneratedScript = useOpenRouterGeneratedScriptSettlement(generatedScriptSettlement);

  const {
    activeOpenRouterJobs,
    openRouterJobNotifications,
    openRouterJobStatus,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    trackOpenRouterJob,
    recordOpenRouterGenerationFailure,
    resetOpenRouterJobsRuntime,
  } = useOpenRouterJobsRuntime({
    ...jobs,
    onCreateGenerationErrorSession: createCustomOpenRouterErrorSessionForJob,
    onGeneratedScript: settleOpenRouterGeneratedScript,
  });

  resetOpenRouterJobsRuntimeRef.current = resetOpenRouterJobsRuntime;

  const isOnline = useOnlineStatus();
  const openRouterOfflineTitle = isOnline
    ? ''
    : 'Needs internet. Local practice still works offline and results stay on this device.';

  const generationRuntime = useOpenRouterGenerationRuntime({
    ...generation,
    access: {
      ...generation.access,
      isOnline,
    },
    jobActions: {
      trackOpenRouterJob,
      recordOpenRouterGenerationFailure,
      createOpenRouterErrorSession,
    },
  });

  return {
    isOnline,
    openRouterOfflineTitle,
    createOpenRouterErrorSession,
    activeOpenRouterJobs,
    openRouterJobNotifications,
    openRouterJobStatus,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    trackOpenRouterJob,
    ...generationRuntime,
  };
}
