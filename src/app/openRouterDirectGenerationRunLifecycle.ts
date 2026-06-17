import { requestTrainingNotificationPermission } from '../core/trainingNotifications';
import { perfDiagnostics } from '../core/perfDiagnostics';
import type {
  GenerateOpenRouterDirectSessionOptions,
  UseOpenRouterDirectGenerationRunnerOptions,
} from './openRouterDirectGenerationRunnerTypes';

type StartOpenRouterDirectGenerationRunArgs = Pick<
  GenerateOpenRouterDirectSessionOptions,
  'userIntent' | 'targetDifficulty' | 'durationMinutes' | 'setBusy'
> &
  Pick<
    UseOpenRouterDirectGenerationRunnerOptions,
    'setOpenRouterError' | 'setSelectedBenchmarkInputMode' | 'setSelectedBenchmarkLanguage'
  > & {
    inputMode: Parameters<UseOpenRouterDirectGenerationRunnerOptions['setSelectedBenchmarkInputMode']>[0];
    language: Parameters<UseOpenRouterDirectGenerationRunnerOptions['setSelectedBenchmarkLanguage']>[0];
  };

type FinishOpenRouterDirectGenerationRunArgs = Pick<GenerateOpenRouterDirectSessionOptions, 'setBusy'> & {
  endPerfSpan: () => void;
};

export type OpenRouterDirectGenerationRunLifecycle = {
  generationStartedAt: string;
  endPerfSpan: () => void;
};

export function startOpenRouterDirectGenerationRun({
  userIntent,
  targetDifficulty,
  durationMinutes,
  inputMode,
  language,
  setBusy,
  setOpenRouterError,
  setSelectedBenchmarkInputMode,
  setSelectedBenchmarkLanguage,
}: StartOpenRouterDirectGenerationRunArgs): OpenRouterDirectGenerationRunLifecycle {
  void requestTrainingNotificationPermission();
  const endPerfSpan = perfDiagnostics.startSpan('openrouter.generateDirectSession', {
    userIntent,
    targetDifficulty,
    durationMinutes,
  });
  const generationStartedAt = new Date().toISOString();

  setBusy(true);
  setOpenRouterError('');
  setSelectedBenchmarkInputMode(inputMode);
  setSelectedBenchmarkLanguage(language);

  return {
    generationStartedAt,
    endPerfSpan,
  };
}

export function finishOpenRouterDirectGenerationRun({
  setBusy,
  endPerfSpan,
}: FinishOpenRouterDirectGenerationRunArgs): void {
  setBusy(false);
  endPerfSpan();
}
