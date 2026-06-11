import { useCallback } from 'react';
import type {
  InputMode,
  ListeningTrainingIntent,
} from '../core/adaptive/types';
import {
  createEmptyInputLanguageBenchmark,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  buildOpenRouterGenerationPrompt,
  estimateOpenRouterPromptSize,
  getOpenRouterGenerationMaxTokens,
  type OpenRouterDurationMinutes,
} from '../core/adaptive/openRouterGenerationPrompt';
import type { DictationScriptDifficulty } from '../core/adaptive/dictationScriptValidation';
import {
  selectLatestAdaptiveSessionFeedback,
} from '../core/adaptive/sessionFeedback';
import {
  isTransientOpenRouterGenerationError,
} from '../core/adaptive/openRouterFallbackScript';
import type {
  ActiveOpenRouterJob,
  OpenRouterJobResponse,
} from '../core/openRouterJobs';
import {
  requestTrainingNotificationPermission,
} from '../core/trainingNotifications';
import { perfDiagnostics } from '../core/perfDiagnostics';
import {
  formatInterruptedOpenRouterMessage,
  parseTimestampMs,
  shouldCreatePersistentGenerationErrorSession,
} from '../components/openrouter/openRouterViewHelpers';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import { buildOpenRouterActivityHints } from './adaptiveFeedbackContext';
import { mapSessionInputMode } from './appRuntimeHelpers';
import { buildOpenRouterDiversificationHints } from './openRouterPromptHints';
import type { StoredSession } from './sessionTypes';

type OpenRouterGenerationBusyControls = {
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

type CreateGenerationErrorSessionArgs = {
  slotLabel: string;
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  message: string;
};

type UseOpenRouterGenerationActionsOptions = OpenRouterGenerationBusyControls & {
  sessions: StoredSession[];
  activeSession: StoredSession | null;
  openRouterAccessAllowed: boolean;
  openRouterAccessMessage: string;
  isOnline: boolean;
  effectiveOpenRouterDefaultModel: string;
  dictaLanguageView: BenchmarkLanguageButton;
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  recentDictationSessionHints: RecentDictationSessionHint[];
  getAuthHeaders: () => Record<string, string>;
  ensureCanCreateDictationSession: (messageTarget: 'error' | 'openrouter' | 'export') => boolean;
  showOpenRouterWorkspace: () => void;
  setOpenRouterGenerateFocusRequest: (updater: (value: number) => number) => void;
  setOpenRouterError: (message: string) => void;
  setSelectedBenchmarkInputMode: (inputMode: InputMode) => void;
  setSelectedBenchmarkLanguage: (language: BenchmarkLanguageButton) => void;
  setBenchmarkExportMessage: (message: string) => void;
  setSessionFeedbackMessage: (message: string) => void;
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

type GenerateDirectSessionOptions = {
  slotLabel: string;
  displayLabel: string;
  durationMinutes: OpenRouterDurationMinutes;
  isBusy: boolean;
  setBusy: (value: boolean) => void;
  userIntent?: ListeningTrainingIntent;
  targetDifficulty?: DictationScriptDifficulty;
  difficultyInstruction?: string;
};

export function useOpenRouterGenerationActions({
  sessions,
  activeSession,
  openRouterAccessAllowed,
  openRouterAccessMessage,
  isOnline,
  effectiveOpenRouterDefaultModel,
  dictaLanguageView,
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  recentDictationSessionHints,
  getAuthHeaders,
  ensureCanCreateDictationSession,
  showOpenRouterWorkspace,
  setOpenRouterGenerateFocusRequest,
  setOpenRouterError,
  setSelectedBenchmarkInputMode,
  setSelectedBenchmarkLanguage,
  setBenchmarkExportMessage,
  setSessionFeedbackMessage,
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
}: UseOpenRouterGenerationActionsOptions) {
  const openOpenRouterGenerateForActiveInput = useCallback((): void => {
    if (!activeSession) return;
    if (!openRouterAccessAllowed) {
      setOpenRouterError(openRouterAccessMessage);
      return;
    }
    if (!ensureCanCreateDictationSession('openrouter')) return;
    if (!isOnline) {
      setOpenRouterError('OpenRouter needs internet. You can keep practicing offline; results are saved on this device and will sync when the connection returns.');
      return;
    }
    const inputMode = mapSessionInputMode(activeSession.inputMode);
    const language: BenchmarkLanguageButton = dictaLanguageView;
    setSelectedBenchmarkInputMode(inputMode);
    setSelectedBenchmarkLanguage(language);
    setBenchmarkExportMessage('');
    setSessionFeedbackMessage('');
    showOpenRouterWorkspace();
    setOpenRouterGenerateFocusRequest((value) => value + 1);
  }, [
    activeSession,
    dictaLanguageView,
    ensureCanCreateDictationSession,
    isOnline,
    openRouterAccessAllowed,
    openRouterAccessMessage,
    setBenchmarkExportMessage,
    setOpenRouterError,
    setOpenRouterGenerateFocusRequest,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
    setSessionFeedbackMessage,
    showOpenRouterWorkspace,
  ]);

  const generateDirectSessionFromOpenRouter = useCallback(async ({
    slotLabel,
    displayLabel,
    durationMinutes,
    isBusy,
    setBusy,
    userIntent,
    targetDifficulty,
    difficultyInstruction,
  }: GenerateDirectSessionOptions): Promise<void> => {
    if (!activeSession || isBusy) return;
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
    const inputMode = mapSessionInputMode(activeSession.inputMode);
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
    const targetMaxTokens = getOpenRouterGenerationMaxTokens(durationMinutes);
    try {
      const profile = adaptiveBenchmarksByInputLanguage[inputMode]?.[language] ?? createEmptyInputLanguageBenchmark(inputMode, language);
      const sessionFeedback = selectLatestAdaptiveSessionFeedback(
        adaptiveSessionFeedbackByInputLanguage[inputMode]?.[language],
        inputMode,
        language,
      );
      const directPromptArgs = {
        profile,
        sessionFeedback,
        promptSource: 'compact-adaptive-v2' as const,
        durationMinutes,
        userIntent,
        targetDifficulty,
        difficultyInstruction,
        diversificationHints: buildOpenRouterDiversificationHints({
          durationMinutes,
          targetDifficulty,
          recentSessions: recentDictationSessionHints,
          activityHints: buildOpenRouterActivityHints({
            sessions,
            inputMode,
            language,
            benchmarkSessionCount: profile.sessionCount,
          }),
        }),
      };
      const { prompt, trainingPrescription } = buildOpenRouterGenerationPrompt(directPromptArgs);
      const resolvedTargetDifficulty = trainingPrescription.difficulty;
      const promptSize = estimateOpenRouterPromptSize(prompt, {
        promptMode: 'compact-adaptive-v2',
        durationMinutes,
        targetDifficulty: resolvedTargetDifficulty,
        inputMode,
        language,
      });
      const response = await fetch('/api/openrouter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          model,
          prompt,
          maxTokens: targetMaxTokens,
          slotLabel,
          inputMode,
          language,
          durationMinutes,
          targetDifficulty: resolvedTargetDifficulty,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Generation request failed (${response.status}).`);
      }
      const payload = (await response.json()) as OpenRouterJobResponse;
      const jobId = payload.jobId;
      if (!jobId) throw new Error('OpenRouter job did not return an id.');
      const activeJob: ActiveOpenRouterJob = {
        jobId,
        model,
        slotLabel,
        inputMode,
        language,
        durationMinutes,
        targetDifficulty: resolvedTargetDifficulty,
        promptMode: promptSize.promptMode,
        promptCharacterCount: promptSize.characterCount,
        promptApproximateTokenCount: promptSize.approximateTokenCount,
        origin: 'direct-training',
        startedAt: generationStartedAt,
      };
      trackOpenRouterJob(activeJob);
    } catch (err) {
      const message =
        err instanceof TypeError
          ? 'Failed to reach OpenRouter endpoint. Refresh the page and try a free model such as openrouter/free.'
          : err instanceof Error
            ? err.message
            : 'OpenRouter generation failed.';
      recordOpenRouterGenerationFailure({
        slotLabel,
        displayLabel,
        model,
        startedAt: generationStartedAt,
        error: message,
      });
      if (isTransientOpenRouterGenerationError(message)) {
        const nowMs = Date.now();
        setOpenRouterError(
          formatInterruptedOpenRouterMessage(slotLabel, model, Math.max(0, nowMs - parseTimestampMs(generationStartedAt, nowMs))),
        );
      } else if (shouldCreatePersistentGenerationErrorSession(message)) {
        createOpenRouterErrorSession({
          slotLabel,
          inputMode,
          language,
          message,
        }, { navigateToLeaderboard: false });
      } else {
        setOpenRouterError(message);
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
      slotLabel: 'Easy direct session',
      displayLabel: 'Easy session',
      durationMinutes: 2,
      isBusy: directOpenRouterBusy,
      setBusy: setDirectOpenRouterBusy,
      userIntent: 'recover',
      targetDifficulty: 'easy',
      difficultyInstruction: 'Recovery intent: keep material accessible and obey the trainer prescription if it narrows the range.',
    });
  }, [directOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectOpenRouterBusy]);

  const generateIntermediateNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Intermediate direct session',
      displayLabel: 'Medium session',
      durationMinutes: 2,
      isBusy: directIntermediateOpenRouterBusy,
      setBusy: setDirectIntermediateOpenRouterBusy,
      userIntent: 'progress',
      targetDifficulty: 'normal',
      difficultyInstruction: 'Progress intent: use moderate phrase difficulty only when the trainer prescription allows it.',
    });
  }, [directIntermediateOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectIntermediateOpenRouterBusy]);

  const generateAdvancedNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Advanced direct session',
      displayLabel: 'Hard session',
      durationMinutes: 2,
      isBusy: directAdvancedOpenRouterBusy,
      setBusy: setDirectAdvancedOpenRouterBusy,
      userIntent: 'challenge',
      targetDifficulty: 'hard',
      difficultyInstruction: 'Challenge intent: use harder content only if the trainer prescription keeps the session in challenge mode.',
    });
  }, [directAdvancedOpenRouterBusy, generateDirectSessionFromOpenRouter, setDirectAdvancedOpenRouterBusy]);

  const generateExpressEasyNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Express easy direct session',
      displayLabel: 'Express easy session',
      durationMinutes: 1,
      isBusy: expressEasyOpenRouterBusy,
      setBusy: setExpressEasyOpenRouterBusy,
      userIntent: 'recover',
      targetDifficulty: 'easy',
      difficultyInstruction: 'Express recovery intent: keep material accessible and obey the trainer prescription if it narrows the range.',
    });
  }, [expressEasyOpenRouterBusy, generateDirectSessionFromOpenRouter, setExpressEasyOpenRouterBusy]);

  const generateExpressIntermediateNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Express intermediate direct session',
      displayLabel: 'Express medium session',
      durationMinutes: 1,
      isBusy: expressIntermediateOpenRouterBusy,
      setBusy: setExpressIntermediateOpenRouterBusy,
      userIntent: 'progress',
      targetDifficulty: 'normal',
      difficultyInstruction: 'Express progress intent: use moderate phrase difficulty only when the trainer prescription allows it.',
    });
  }, [expressIntermediateOpenRouterBusy, generateDirectSessionFromOpenRouter, setExpressIntermediateOpenRouterBusy]);

  const generateExpressAdvancedNextSessionFromOpenRouter = useCallback(async (): Promise<void> => {
    await generateDirectSessionFromOpenRouter({
      slotLabel: 'Express advanced direct session',
      displayLabel: 'Express hard session',
      durationMinutes: 1,
      isBusy: expressAdvancedOpenRouterBusy,
      setBusy: setExpressAdvancedOpenRouterBusy,
      userIntent: 'challenge',
      targetDifficulty: 'hard',
      difficultyInstruction: 'Express challenge intent: use harder content only if the trainer prescription keeps the session in challenge mode.',
    });
  }, [expressAdvancedOpenRouterBusy, generateDirectSessionFromOpenRouter, setExpressAdvancedOpenRouterBusy]);

  return {
    openOpenRouterGenerateForActiveInput,
    generateEasyNextSessionFromOpenRouter,
    generateIntermediateNextSessionFromOpenRouter,
    generateAdvancedNextSessionFromOpenRouter,
    generateExpressEasyNextSessionFromOpenRouter,
    generateExpressIntermediateNextSessionFromOpenRouter,
    generateExpressAdvancedNextSessionFromOpenRouter,
  };
}
