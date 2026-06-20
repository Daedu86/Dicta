import { buildOpenRouterDirectGenerationStartPlan } from './openRouterDirectGenerationStartPlan';
import { handleOpenRouterDirectGenerationFailure } from './openRouterDirectGenerationFailureHandler';
import { runOpenRouterDirectGenerationJobRequest } from './openRouterDirectGenerationJobRunner';
import {
  finishOpenRouterDirectGenerationRun,
  startOpenRouterDirectGenerationRun,
} from './openRouterDirectGenerationRunLifecycle';
import type {
  GenerateOpenRouterDirectSessionOptions,
  UseOpenRouterDirectGenerationRunnerOptions,
} from './openRouterDirectGenerationRunnerTypes';

export async function runOpenRouterDirectGeneration(
  runnerOptions: UseOpenRouterDirectGenerationRunnerOptions,
  generationOptions: GenerateOpenRouterDirectSessionOptions,
): Promise<void> {
  const {
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
  } = runnerOptions;
  const {
    id,
    slotLabel,
    displayLabel,
    durationMinutes,
    isBusy,
    setBusy,
    userIntent,
    targetDifficulty,
    difficultyInstruction,
    topicContext,
  } = generationOptions;

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
  const { generationStartedAt, endPerfSpan } = startOpenRouterDirectGenerationRun({
    userIntent,
    targetDifficulty,
    durationMinutes,
    inputMode,
    language,
    setBusy,
    setOpenRouterError,
    setSelectedBenchmarkInputMode,
    setSelectedBenchmarkLanguage,
  });

  try {
    const activeJob = await runOpenRouterDirectGenerationJobRequest({
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
      topicContext,
      inputMode,
      language,
      sessions,
      adaptiveBenchmarksByInputLanguage,
      adaptiveSessionFeedbackByInputLanguage,
      recentDictationSessionHints,
      generationStartedAt,
      getAuthHeaders,
    });
    trackOpenRouterJob(activeJob);
  } catch (err) {
    handleOpenRouterDirectGenerationFailure({
      err,
      slotLabel,
      displayLabel,
      model,
      inputMode,
      language,
      generationStartedAt,
      recordOpenRouterGenerationFailure,
      createOpenRouterErrorSession,
      setOpenRouterError,
    });
  } finally {
    finishOpenRouterDirectGenerationRun({ setBusy, endPerfSpan });
  }
}
