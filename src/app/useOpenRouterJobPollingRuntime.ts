import { useCallback, useEffect, useRef } from 'react';
import { pollOpenRouterJobs } from './openRouterJobPoller';
import type { OpenRouterJobPollingCallbacks } from './openRouterJobPollingTypes';
import type {
  OpenRouterJobPollingRuntime,
  OpenRouterJobPollingRuntimeOptions,
} from './useOpenRouterJobPollingRuntimeTypes';

export type {
  OpenRouterJobPollingRuntime,
  OpenRouterJobPollingRuntimeOptions,
} from './useOpenRouterJobPollingRuntimeTypes';

export function useOpenRouterJobPollingRuntime({
  activeOpenRouterJobs,
  localStorageReady,
  openRouterAccessAllowed,
  getAuthHeaders,
  onOpenRouterError,
  onCreateGenerationErrorSession,
  onGeneratedScript,
  setActiveOpenRouterJobs,
  setOpenRouterJobNotifications,
  setOpenRouterJobStatus,
  setTrainingGenerationNotices,
}: OpenRouterJobPollingRuntimeOptions): OpenRouterJobPollingRuntime {
  const consumedOpenRouterJobIdsRef = useRef<Set<string>>(new Set());
  const callbacksRef = useRef<OpenRouterJobPollingCallbacks>({
    getAuthHeaders,
    onOpenRouterError,
    onCreateGenerationErrorSession,
    onGeneratedScript,
  });

  useEffect(() => {
    callbacksRef.current = {
      getAuthHeaders,
      onOpenRouterError,
      onCreateGenerationErrorSession,
      onGeneratedScript,
    };
  }, [getAuthHeaders, onCreateGenerationErrorSession, onGeneratedScript, onOpenRouterError]);

  useEffect(() => {
    if (!localStorageReady || activeOpenRouterJobs.length === 0 || !openRouterAccessAllowed) {
      return;
    }

    let cancelled = false;
    let intervalId = 0;

    const runPoll = () => {
      void pollOpenRouterJobs({
        activeOpenRouterJobs,
        callbacksRef,
        consumedOpenRouterJobIdsRef,
        isCancelled: () => cancelled,
        setActiveOpenRouterJobs,
        setOpenRouterJobNotifications,
        setOpenRouterJobStatus,
        setTrainingGenerationNotices,
      });
    };

    runPoll();
    intervalId = window.setInterval(runPoll, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeOpenRouterJobs,
    localStorageReady,
    openRouterAccessAllowed,
    setActiveOpenRouterJobs,
    setOpenRouterJobNotifications,
    setOpenRouterJobStatus,
    setTrainingGenerationNotices,
  ]);

  const resetOpenRouterJobPollingRuntime = useCallback((): void => {
    consumedOpenRouterJobIdsRef.current = new Set();
  }, []);

  return { resetOpenRouterJobPollingRuntime };
}
