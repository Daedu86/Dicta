import { normalizeInputLanguageBenchmarkForRecommendation } from './AdaptiveInputLanguageBenchmarkService';
import { buildListeningTrainingPrescription } from './ListeningTrainerPolicy';
import { buildOpenRouterGenerationPromptContextPackage } from './openRouterGenerationPromptContextPackage';
import type {
  OpenRouterGenerationPromptArgs,
  OpenRouterGenerationPromptPayload,
} from './openRouterGenerationPromptTypes';
import { selectOpenRouterSourcePayload } from './openRouterGenerationSourcePayload';
import { buildCompactAdaptiveV2Prompt, buildOpenRouterHardRulesPrompt } from './openRouterPromptRules';

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
  const promptContext = buildOpenRouterGenerationPromptContextPackage({
    normalizedProfile,
    sessionFeedback,
    trainingPrescription,
  });

  if (promptSource === 'compact-adaptive-v2') {
    return {
      prompt: buildCompactAdaptiveV2Prompt({
        normalizedProfile,
        trainingPrescription,
        outputTemplate: promptContext.outputTemplate,
        durationMinutes,
        targetDifficulty,
        difficultyInstruction,
        diversificationHints,
        compactAdaptiveV2Context: promptContext.compactAdaptiveV2Context,
      }),
      outputTemplate: promptContext.outputTemplate,
      trainingPrescription,
    };
  }

  return {
    prompt: `${buildOpenRouterHardRulesPrompt({
      normalizedProfile,
      outputTemplate: promptContext.outputTemplate,
      durationMinutes,
      trainingPrescription,
      targetDifficulty,
      difficultyInstruction,
      diversificationHints,
    })}\n\nGeneration context:\n${selectOpenRouterSourcePayload({
      promptSource,
      hasSessionFeedback: Boolean(sessionFeedback),
      compactPromptPackage: promptContext.compactPromptPackage,
      compactBenchmarkOnlyPackage: promptContext.compactBenchmarkOnlyPackage,
      originalAdaptivePackage: promptContext.originalAdaptivePackage,
      originalBenchmarkOnlyPackage: promptContext.originalBenchmarkOnlyPackage,
      llmPrompt: promptContext.llmPrompt,
    })}`,
    outputTemplate: promptContext.outputTemplate,
    trainingPrescription,
  };
}
