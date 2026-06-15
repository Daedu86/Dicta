import { useCallback } from 'react';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import {
  buildGeneratedTrainingSessionNotification,
  showGeneratedTrainingSessionNotification,
  type TrainingSessionNotificationPayload,
} from '../core/trainingNotifications';

type CreateSessionFromOpenRouterScript = (
  script: DictationScript,
  options: { navigateToLeaderboard: false; generationOrigin: 'openrouter' },
) => void;

type OpenRouterGeneratedScriptSettlementDeps = {
  createSessionFromOpenRouterScript: CreateSessionFromOpenRouterScript;
  buildNotification?: (
    script: DictationScript,
    trackedJob: ActiveOpenRouterJob,
  ) => TrainingSessionNotificationPayload;
  showNotification?: (payload: TrainingSessionNotificationPayload) => Promise<boolean>;
};

export function settleOpenRouterGeneratedScript(
  script: DictationScript,
  trackedJob: ActiveOpenRouterJob,
  {
    createSessionFromOpenRouterScript,
    buildNotification = buildGeneratedTrainingSessionNotification,
    showNotification = showGeneratedTrainingSessionNotification,
  }: OpenRouterGeneratedScriptSettlementDeps,
): void {
  createSessionFromOpenRouterScript(script, {
    navigateToLeaderboard: false,
    generationOrigin: 'openrouter',
  });
  void showNotification(buildNotification(script, trackedJob));
}

export function useOpenRouterGeneratedScriptSettlement({
  createSessionFromOpenRouterScript,
}: Pick<OpenRouterGeneratedScriptSettlementDeps, 'createSessionFromOpenRouterScript'>) {
  return useCallback((script: DictationScript, trackedJob: ActiveOpenRouterJob): void => {
    settleOpenRouterGeneratedScript(script, trackedJob, {
      createSessionFromOpenRouterScript,
    });
  }, [createSessionFromOpenRouterScript]);
}
