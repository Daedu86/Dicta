import { useCallback } from 'react';
import type { InputMode } from '../core/adaptive/types';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import { requestTrainingNotificationPermission } from '../core/trainingNotifications';
import { perfDiagnostics } from '../core/perfDiagnostics';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import { buildOpenRouterDirectGenerationJobPlan } from './openRouterDirectGenerationJobPlan';
import { buildOpenRouterDirectGenerationStartPlan } from './openRouterDirectGenerationStartPlan';
import type { OpenRouterDirectGenerationPreset } from './openRouterDirectGenerationPresets';
import { requestOpenRouterGenerationJob } from './openRouterGenerationJobRequest';
import { resolveOpenRouterDirectGenerationFailure } from './openRouterGenerationFailurePolicy';
import type { StoredSession } from './sessionTypes';

type RecentDictationSessionHint = {
  title: string;
  opener: string;
};

export type CreateGenerationErrorSessionArgs = {
  slotLabel: string;
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  message: string;
};

export type UseOpenRouterDirectGenerationRunnerOptions = {
  sessions: StoredSession[];
  activeSession: StoredSession | null;
  openRouterAccessAllowed: boolean;
  openRouterAccessMessage: string;
  isOnline: boolean;
  effectiveOpenRouterDefaultModel: string;
  fallbackInputMode: InputMode;
  dictaLanguageView: BenchmarkLanguageButton;
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  recentDictationSessionHints: RecentDictationSessionHint[];
  getAuthHeaders: () => Record<string, string>;
  ensureCanCreateDictationSession: (messageTarget: 'error' | 'openrouter' | 'export') => boolean;
  setOpenRouterError: (message: string) => void;
  setSelectedBenchmarkInputMode: (inputMode: InputMode) => void;
  setSelectedBenchmarkLanguage: (language: BenchmarkLanguageButton) => void;
  trackOpenRouterJob: (activeJob: ActiveOpenRouterJob) => void;
  recordOpenRouterGenerationFailure: (notice: {
    slotLabel: string;
    displayLabel: string;
    model: string;
    startedAt: string;
    error: string;
    completedAt?: string;
  }) => void;
  createOpenRouterErrorSession: (
    args: CreateGenerationErrorSessionArgs,
    options?: { navigateToLeaderboard?: boolean },
  ) => void;
};

export type GenerateOpenRouterDirectSessionOptions = OpenRouterDirectGenerationPreset & {
  isBusy: boolean;
  setBusy: (value: boolean) => void;
};

export function useOpenRouterDirectGenerationRunner({
  sessions,
  activeSession,
  openRouterAccessAllowed,
  openRouterAccessMessage,
  isOnline,
  effectiveOpenRouterDefaultModel,
  fallbackInputMode,
  dictaLanguageView,
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  recentDictationSessionHints,
  getAuthHeaders,
  ensureCanCreateDictationSession,
  setOpenRouterError,
  setSelectedBenchmarkInputMode,
  setSelectedBenchmarkLanguage,
  trackOpenRouterJob,
  recordOpenRouterGenerationFailure,
  createOpenRouterErrorSession,
}: UseOpenRouterDirectGenerationRunnerOptions) {
  return useCallback(async ({
    id,
    slotLabel,
    displayLabel,
    durationMinutes,
    isBusy,
    setBusy,
    userIntent,
    targetDifficulty,
    difficultyInstruction,
  }: GenerateOpenRouterDirectSessionOptions): Promise<void> => {
    if (isBusy) return;
    if (!openRouterAccessAllowed) {
      setOpenRouterError(openRouterAccessMessage);
      return;
    }
    if (!ensureCanCreateDictationSession('openrouter')) return;

    const startPlan = buildOpenRouterDirectGenerationStartPlan({
      activeSessionInputMode: activeSession?.inputMode ?? null,
      fallbackInputMode,
      dictaLanguageView,
      effectiveOpenRouterDefaultModel,
      isOnline,
    });

    if (startPlan.status === 'error') {
      setOpenRouterError(startPlan.message);
      return;
    }

    const { model, inputMode, language } = startPlan;

    void requestTrainingNotificationPermission();

    const endPerfSpan = perfDiagnostics.startSpan('openrouter.generateDirectSession', { userIntent, targetDifficulty, durationMinutes });
    const generationStartedAt = new Date().toISOString();
    setBusy(true);
    setOpenRouterError('');
    setSelectedBenchmarkInputMode(inputMode);
    setSelectedBenchmarkLanguage(language);
    try {
      const jobPlan = buildOpenRouterDirectGenerationJobPlan({
        model,
        preset: {
          id,
          slotLabel,
          displayLabel,
          durationMinutes,
          userIntent,
          targetDifficulty,
          difficultyInstruction,
        },
        inputMode,
        language,
        sessions,
        adaptiveBenchmarksByInputLanguage,
        adaptiveSessionFeedbackByInputLanguage,
        recentDictationSessionHints,
        generationStartedAt,
      });
      const activeJob = await requestOpenRouterGenerationJob({
        jobPlan,
        requestHeaders: getAuthHeaders(),
      });
      trackOpenRouterJob(activeJob);
    } catch (err) {
      const message =
        err instanceof TypeError
          ? 'Failed to reach OpenRouter endpoint. Refresh the page and try a free model such as openrouter/free.'
          : err instanceof Error
            ? err.message
            : 'OpenRouter generation failed.';
      const failure = resolveOpenRouterDirectGenerationFailure({
        slotLabel,
        displayLabel,
        model,
        startedAt: generationStartedAt,
        message,
      });
      recordOpenRouterGenerationFailure(failure.notice);
      if (failure.createPersistentErrorSession) {
        createOpenRouterErrorSession({
          slotLabel,
          inputMode,
          language,
          message,
        }, { navigateToLeaderboard: false });
      } else if (failure.openRouterErrorMessage) {
        setOpenRouterError(failure.openRouterErrorMessage);
      }
    } finally {
      setBusy(false);
      endPerfSpan();
    }
  }, [
    activeSession,
    adaptiveBenchmarksByInputLanguage,
    adaptiveSessionFeedbackByInputLanguage,
    createOpenRouterErrorSession,
    dictaLanguageView,
    effectiveOpenRouterDefaultModel,
    ensureCanCreateDictationSession,
    fallbackInputMode,
    getAuthHeaders,
    isOnline,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    recentDictationSessionHints,
    recordOpenRouterGenerationFailure,
    sessions,
    setOpenRouterError,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    trackOpenRouterJob,
  ]);
}
