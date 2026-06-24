import { useOnlineStatus } from './useOnlineStatus';
import {
  useDictaOpenRouterJobsRuntime,
  type UseDictaOpenRouterJobsRuntimeOptions,
} from './useDictaOpenRouterJobsRuntime';
import { useOpenRouterGenerationRuntime } from './useOpenRouterGenerationRuntime';

type OpenRouterGenerationRuntimeOptions = Parameters<typeof useOpenRouterGenerationRuntime>[0];

type UseDictaOpenRouterRuntimeOptions = UseDictaOpenRouterJobsRuntimeOptions & {
  generation: Omit<OpenRouterGenerationRuntimeOptions, 'access' | 'jobActions'> & {
    access: Omit<OpenRouterGenerationRuntimeOptions['access'], 'isOnline'>;
  };
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
    activeOpenRouterJobs,
    openRouterJobNotifications,
    openRouterJobStatus,
    trainingGenerationNotices,
    trainingGenerationNowMs,
    trackOpenRouterJob,
    cancelOpenRouterJob,
    recordOpenRouterGenerationFailure,
  } = useDictaOpenRouterJobsRuntime({
    errorSessionActions,
    generatedScriptSettlement,
    jobs,
    resetOpenRouterJobsRuntimeRef,
  });

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
    cancelOpenRouterJob,
    ...generationRuntime,
  };
}
