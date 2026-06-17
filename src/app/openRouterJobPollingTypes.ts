import type { Dispatch, SetStateAction } from 'react';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type { OpenRouterJobNotification, TrainingGenerationNotice } from '../components/openrouter/types';

export type MutableValueRef<T> = {
  current: T;
};

export type OpenRouterJobPollingCallbacks = {
  getAuthHeaders: () => Record<string, string>;
  onOpenRouterError: (message: string) => void;
  onCreateGenerationErrorSession: (trackedJob: ActiveOpenRouterJob, message: string) => void;
  onGeneratedScript: (script: DictationScript, trackedJob: ActiveOpenRouterJob) => void;
};

export type OpenRouterJobNotificationsSetter = Dispatch<
  SetStateAction<Record<string, OpenRouterJobNotification>>
>;

export type TrainingGenerationNoticesSetter = Dispatch<
  SetStateAction<Record<string, TrainingGenerationNotice>>
>;

export type ActiveOpenRouterJobsSetter = Dispatch<SetStateAction<ActiveOpenRouterJob[]>>;
export type OpenRouterJobStatusSetter = Dispatch<SetStateAction<string>>;
