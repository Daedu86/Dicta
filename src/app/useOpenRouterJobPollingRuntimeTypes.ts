import type { Dispatch, SetStateAction } from 'react';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type { OpenRouterJobNotification, TrainingGenerationNotice } from '../components/openrouter/types';

export type OpenRouterJobPollingRuntimeOptions = {
  activeOpenRouterJobs: ActiveOpenRouterJob[];
  localStorageReady: boolean;
  openRouterAccessAllowed: boolean;
  getAuthHeaders: () => Record<string, string>;
  onOpenRouterError: (message: string) => void;
  onCreateGenerationErrorSession: (trackedJob: ActiveOpenRouterJob, message: string) => void;
  onGeneratedScript: (script: DictationScript, trackedJob: ActiveOpenRouterJob) => void;
  setActiveOpenRouterJobs: Dispatch<SetStateAction<ActiveOpenRouterJob[]>>;
  setOpenRouterJobNotifications: Dispatch<SetStateAction<Record<string, OpenRouterJobNotification>>>;
  setOpenRouterJobStatus: Dispatch<SetStateAction<string>>;
  setTrainingGenerationNotices: Dispatch<SetStateAction<Record<string, TrainingGenerationNotice>>>;
};

export type OpenRouterJobPollingRuntime = {
  resetOpenRouterJobPollingRuntime: () => void;
};
