import {
  createEmptyInputLanguageBenchmark,
} from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  buildOpenRouterGenerationPrompt,
  estimateOpenRouterPromptSize,
  getOpenRouterGenerationMaxTokens,
} from '../core/adaptive/openRouterGenerationPrompt';
import { selectLatestAdaptiveSessionFeedback } from '../core/adaptive/sessionFeedback';
import type { InputMode } from '../core/adaptive/types';
import type { ActiveOpenRouterJob } from '../core/openRouterJobs';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
  BenchmarkLanguageButton,
} from '../components/openrouter/types';
import { buildOpenRouterActivityHints } from './adaptiveFeedbackContext';
import { buildOpenRouterDiversificationHints } from './openRouterPromptHints';
import type { OpenRouterDirectGenerationPreset } from './openRouterDirectGenerationPresets';
import type { StoredSession } from './sessionTypes';

type RecentDictationSessionHint = {
  title: string;
  opener: string;
};

export type OpenRouterDirectGenerationJobRequestBody = {
  model: string;
  prompt: string;
  maxTokens: number;
  slotLabel: string;
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  durationMinutes: OpenRouterDirectGenerationPreset['durationMinutes'];
  targetDifficulty: OpenRouterDirectGenerationPreset['targetDifficulty'];
};

export type OpenRouterDirectGenerationActiveJobDraft = Omit<ActiveOpenRouterJob, 'jobId'>;

export type OpenRouterDirectGenerationJobPlan = {
  slotLabel: string;
  displayLabel: string;
  prompt: string;
  targetMaxTokens: number;
  jobRequestBody: OpenRouterDirectGenerationJobRequestBody;
  activeJobDraft: OpenRouterDirectGenerationActiveJobDraft;
};

export type OpenRouterDirectGenerationJobPlanArgs = {
  model: string;
  preset: OpenRouterDirectGenerationPreset;
  inputMode: InputMode;
  language: BenchmarkLanguageButton;
  sessions: StoredSession[];
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  recentDictationSessionHints: RecentDictationSessionHint[];
  generationStartedAt: string;
};

export function buildOpenRouterDirectGenerationJobPlan({
  model,
  preset,
  inputMode,
  language,
  sessions,
  adaptiveBenchmarksByInputLanguage,
  adaptiveSessionFeedbackByInputLanguage,
  recentDictationSessionHints,
  generationStartedAt,
}: OpenRouterDirectGenerationJobPlanArgs): OpenRouterDirectGenerationJobPlan {
  const {
    slotLabel,
    displayLabel,
    durationMinutes,
    userIntent,
    targetDifficulty,
    difficultyInstruction,
  } = preset;
  const targetMaxTokens = getOpenRouterGenerationMaxTokens(durationMinutes);
  const profile =
    adaptiveBenchmarksByInputLanguage[inputMode]?.[language] ??
    createEmptyInputLanguageBenchmark(inputMode, language);
  const sessionFeedback = selectLatestAdaptiveSessionFeedback(
    adaptiveSessionFeedbackByInputLanguage[inputMode]?.[language],
    inputMode,
    language,
  );
  const { prompt, trainingPrescription } = buildOpenRouterGenerationPrompt({
    profile,
    sessionFeedback,
    promptSource: 'compact-adaptive-v2',
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
  });
  const resolvedTargetDifficulty = trainingPrescription.difficulty;
  const promptSize = estimateOpenRouterPromptSize(prompt, {
    promptMode: 'compact-adaptive-v2',
    durationMinutes,
    targetDifficulty: resolvedTargetDifficulty,
    inputMode,
    language,
  });

  return {
    slotLabel,
    displayLabel,
    prompt,
    targetMaxTokens,
    jobRequestBody: {
      model,
      prompt,
      maxTokens: targetMaxTokens,
      slotLabel,
      inputMode,
      language,
      durationMinutes,
      targetDifficulty: resolvedTargetDifficulty,
    },
    activeJobDraft: {
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
    },
  };
}
