import { buildSelectedBenchmarkExportPayload } from './benchmarkJson';
import type { DictationScriptDifficulty } from './dictationScriptValidation';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from './dictationScriptPrompt';
import {
  buildCompactAdaptiveV2Context,
  buildCompactBenchmarkContext,
  buildCompactPromptPackage,
  buildCompactSessionFeedbackContext,
} from './openRouterPromptContext';
import { buildCompactAdaptiveV2Prompt, buildOpenRouterHardRulesPrompt } from './openRouterPromptRules';
import { buildBenchmarkFeedbackPromptPackage } from './sessionFeedback';
import { normalizeInputLanguageBenchmarkForRecommendation } from './AdaptiveInputLanguageBenchmarkService';
import { buildListeningTrainingPrescription } from './ListeningTrainerPolicy';
import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  ListeningTrainingIntent,
  ListeningTrainingPrescription,
} from './types';

export type OpenRouterGeneratePromptSource =
  | 'compact-adaptive'
  | 'compact-adaptive-v2'
  | 'compact-benchmark-only'
  | 'compact-base'
  | 'original-adaptive'
  | 'original-benchmark-only'
  | 'original-base';

export type OpenRouterDurationMinutes = 1 | 2 | 3 | 4;

export type OpenRouterGenerationPromptArgs = {
  profile: InputLanguageBenchmarkMetrics;
  sessionFeedback: AdaptiveSessionFeedback | null;
  promptSource: OpenRouterGeneratePromptSource;
  durationMinutes: OpenRouterDurationMinutes;
  userIntent?: ListeningTrainingIntent;
  targetDifficulty?: DictationScriptDifficulty;
  difficultyInstruction?: string;
  diversificationHints?: string[];
};

export type OpenRouterGenerationPromptPayload = {
  prompt: string;
  outputTemplate: string;
  trainingPrescription: ListeningTrainingPrescription;
};

export type OpenRouterPromptSizeEstimate = {
  characterCount: number;
  approximateTokenCount: number;
  promptMode: OpenRouterGeneratePromptSource;
  durationMinutes: OpenRouterDurationMinutes;
  targetDifficulty?: DictationScriptDifficulty;
  inputMode: InputLanguageBenchmarkMetrics['inputMode'];
  language: InputLanguageBenchmarkMetrics['language'];
};

export function estimateOpenRouterPromptSize(
  prompt: string,
  metadata: Omit<OpenRouterPromptSizeEstimate, 'characterCount' | 'approximateTokenCount'>,
): OpenRouterPromptSizeEstimate {
  return {
    ...metadata,
    characterCount: prompt.length,
    approximateTokenCount: Math.max(1, Math.round(prompt.length / 4)),
  };
}

export function getOpenRouterGenerationMaxTokens(durationMinutes: OpenRouterDurationMinutes): number {
  switch (durationMinutes) {
    case 1:
      return 1_800;
    case 2:
      return 2_600;
    case 3:
      return 3_800;
    case 4:
      return 4_800;
  }
}

export function buildOpenRouterGenerationPrompt({
  profile,
  sessionFeedback,
  promptSource,
  durationMinutes,
  userIntent,
  targetDifficulty,
  difficultyInstruction,
  diversificationHints,
}: OpenRouterGenerationPromptArgs): OpenRouterGenerationPromptPayload {
  const normalizedProfile = normalizeInputLanguageBenchmarkForRecommendation(profile);
  const trainingPrescription = buildListeningTrainingPrescription({
    profile: normalizedProfile,
    latestFeedback: sessionFeedback,
    userIntent,
    durationMinutes,
    targetDifficulty,
  });
  const benchmarkJson = JSON.stringify(buildSelectedBenchmarkExportPayload(normalizedProfile), null, 2);
  const llmPrompt = buildDictationScriptPrompt(normalizedProfile);
  const outputTemplate = buildDictationScriptTemplate(normalizedProfile.inputMode, normalizedProfile.language);
  const compactBenchmark = buildCompactBenchmarkContext(normalizedProfile);
  const compactSessionFeedback = buildCompactSessionFeedbackContext(sessionFeedback);
  const compactPromptPackage = buildCompactPromptPackage({ compactBenchmark, compactSessionFeedback, llmPrompt });
  const compactAdaptiveV2Context = buildCompactAdaptiveV2Context({
    normalizedProfile,
    sessionFeedback,
    trainingPrescription,
  });
  const compactBenchmarkOnlyPackage = `Compact benchmark context:\n${compactBenchmark}\n\nLLM prompt:\n${llmPrompt}`;
  const originalBenchmarkOnlyPackage = `Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${llmPrompt}`;
  const originalAdaptivePackage = buildBenchmarkFeedbackPromptPackage(normalizedProfile, sessionFeedback, llmPrompt, {
    activeSessionStatus: undefined,
  });

  if (promptSource === 'compact-adaptive-v2') {
    return {
      prompt: buildCompactAdaptiveV2Prompt({
        normalizedProfile,
        trainingPrescription,
        outputTemplate,
        durationMinutes,
        targetDifficulty,
        difficultyInstruction,
        diversificationHints,
        compactAdaptiveV2Context,
      }),
      outputTemplate,
      trainingPrescription,
    };
  }

  return {
    prompt: `${buildOpenRouterHardRulesPrompt({
      normalizedProfile,
      outputTemplate,
      durationMinutes,
      trainingPrescription,
      targetDifficulty,
      difficultyInstruction,
      diversificationHints,
    })}\n\nGeneration context:\n${selectOpenRouterSourcePayload({
      promptSource,
      hasSessionFeedback: Boolean(sessionFeedback),
      compactPromptPackage,
      compactBenchmarkOnlyPackage,
      originalAdaptivePackage,
      originalBenchmarkOnlyPackage,
      llmPrompt,
    })}`,
    outputTemplate,
    trainingPrescription,
  };
}

type OpenRouterSourcePayloadArgs = {
  promptSource: OpenRouterGeneratePromptSource;
  hasSessionFeedback: boolean;
  compactPromptPackage: string;
  compactBenchmarkOnlyPackage: string;
  originalAdaptivePackage: string;
  originalBenchmarkOnlyPackage: string;
  llmPrompt: string;
};

function selectOpenRouterSourcePayload({
  promptSource,
  hasSessionFeedback,
  compactPromptPackage,
  compactBenchmarkOnlyPackage,
  originalAdaptivePackage,
  originalBenchmarkOnlyPackage,
  llmPrompt,
}: OpenRouterSourcePayloadArgs): string {
  switch (promptSource) {
    case 'compact-adaptive':
      return hasSessionFeedback ? compactPromptPackage : compactBenchmarkOnlyPackage;
    case 'compact-benchmark-only':
      return compactBenchmarkOnlyPackage;
    case 'compact-base':
      return llmPrompt;
    case 'original-adaptive':
      return hasSessionFeedback ? originalAdaptivePackage : originalBenchmarkOnlyPackage;
    case 'original-benchmark-only':
      return originalBenchmarkOnlyPackage;
    case 'original-base':
      return llmPrompt;
    case 'compact-adaptive-v2':
      return compactBenchmarkOnlyPackage;
  }
}
