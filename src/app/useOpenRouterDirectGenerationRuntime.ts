import { useCallback } from 'react';
import type { InputMode } from '../core/adaptive/types';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import {
  requestTrainingNotificationPermission,
} from '../core/trainingNotifications';
import { perfDiagnostics } from '../core/perfDiagnostics';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import { mapSessionInputMode } from './appRuntimeHelpers';
import { buildOpenRouterDirectGenerationJobPlan } from './openRouterDirectGenerationJobPlan';
import {
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from './openRouterDirectGenerationPresets';
import { requestOpenRouterGenerationJob } from './openRouterGenerationJobRequest';
import { resolveOpenRouterDirectGenerationFailure } from './openRouterGenerationFailurePolicy';
import type { StoredSession } from './sessionTypes';

export type OpenRouterGenerationBusyControls = {
  directOpenRouterBusy: boolean;
  setDirectOpenRouterBusy: (value: boolean) => void;
  directIntermediateOpenRouterBusy: boolean;
  setDirectIntermediateOpenRouterBusy: (value: boolean) => void;
  directAdvancedOpenRouterBusy: boolean;
  setDirectAdvancedOpenRouterBusy: (value: boolean) => void;
  expressEasyOpenRouterBusy: boolean;
  setExpressEasyOpenRouterBusy: (value: boolean) => void;
  expressIntermediateOpenRouterBusy: boolean;
  setExpressIntermediateOpenRouterBusy: (value: boolean) => void;
  expressAdvancedOpenRouterBusy: boolean;
  setExpressAdvancedOpenRouterBusy: (value: boolean) => void;
};

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

export type UseOpenRouterDirectGenerationRuntimeOptions = OpenRouterGenerationBusyControls & {
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

type GenerateDirectSessionOptions = OpenRouterDirectGenerationPreset & {
  isBusy: boolean;
  setBusy: (value: boolean) => void;
};

export function useOpenRouterDirectGenerationRuntime({
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
  directOpenRouterBusy,
  setDirectOpenRouterBusy,
  directIntermediateOpenRouterBusy,
  setDirectIntermediateOpenRouterBusy,
  directAdvancedOpenRouterBusy,
  setDirectAdvancedOpenRouterBusy,
  expressEasyOpenRouterBusy,
  setExpressEasyOpenRouterBusy,
  expressIntermediateOpenRouterBusy,
  setExpressIntermediateOpenRouterBusy,
  expressAdvancedOpenRouterBusy,
  setExpressAdvancedOpenRouterBusy,
}: UseOpenRouterDirectGenerationRuntimeOptions) {
  const generateDirectSessionFromOpenRouter = useCallback(async ({
    id,
    slotLabel,
    displayLabel,
    durationMinutes,
    isBusy,
    setBusy,
    userIntent,
    targetDifficulty,
    difficultyInstruction,
  }: GenerateDirectSessionOptions): Promise<void> => {
    if (isBusy) return;
    if (!openRouterAccessAllowed) {
      setOpenRouterError(openRouterAccessMessage);
      return;
    }
    if (!ensureCanCreateDictationSession('openrouter')) return;
    if (!isOnline) {
      setOpenRouterError('OpenRouter needs internet. You can keep practicing offline; results are saved on this device and will sync when the connection returns.');
      return;
    }
    const model = effectiveOpenRouterDefaultModel.trim();
    const inputMode = activeSession ? mapSessionInputMode(activeSession.inputMode) : fallbackInputMode;
    const language: BenchmarkLanguageButton = dictaLanguageView;

    if (!model) {
      setOpenRouterError('Set a default OpenRouter model before generating the next session.');
      return;
    }

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

  const generateEasyNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.easy,
      isBusy: directOpenRouterBusy,
      setBusy: setDirectOpenRouterBusy,
    });
  }, [directOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectOpenRouterBusy]);

  const generateIntermediateNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.medium,
      isBusy: directIntermediateOpenRouterBusy,
      setBusy: setDirectIntermediateOpenRouterBusy,
    });
  }, [directIntermediateOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectIntermediateOpenRouterBusy]);

  const generateAdvancedNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.hard,
      isBusy: directAdvancedOpenRouterBusy,
      setBusy: setDirectAdvancedOpenRouterBusy,
    });
  }, [directAdvancedOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectAdvancedOpenRouterBusy]);

  const generateExpressEasyNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressEasy,
      isBusy: expressEasyOpenRouterBusy,
      setBusy: setExpressEasyOpenRouterBusy,
    });
  }, [expressEasyOpenRouterBusy, generateDirectSessionFromOpenRouter, setExpressEasyOpenRouterBusy]);

  const generateExpressIntermediateNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressMedium,
      isBusy: expressIntermediateOpenRouterBusy,
      setBusy: setExpressIntermediateOpenRouterBusy,
    });
  }, [expressIntermediateOpenRouterBusy, generateDirectSessionFromOpenRouter, setExpressIntermediateOpenRouterBusy]);

  const generateExpressAdvancedNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      ...OPEN_ROUTER_DIRECT_GENERATION_PRESETS.expressHard,
      isBusy: expressAdvancedOpenRouterBusy,
      setBusy: setExpressAdvancedOpenRouterBusy,
    });
  }, [expressAdvancedOpenRouterBusy, generateDirectSessionFromOpenRouter, setExpressAdvancedOpenRouterBusy]);

  return {
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
    generateExpressEasyNextSessionFromOpenRouter,
    generateExpressIntermediateNextSessionFromOpenRouter,
    generateExpressAdvancedNextSessionFromOpenRouter,
  };
}
