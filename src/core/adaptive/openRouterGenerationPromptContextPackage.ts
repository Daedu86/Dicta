import { buildSelectedBenchmarkExportPayload } from './benchmarkJson';
import { buildDictationScriptPrompt, buildDictationScriptTemplate } from './dictationScriptPrompt';
import {
  buildCompactAdaptiveV2Context,
  buildCompactBenchmarkContext,
  buildCompactPromptPackage,
  buildCompactSessionFeedbackContext,
} from './openRouterPromptContext';
import { buildBenchmarkFeedbackPromptPackage } from './sessionFeedback';
import type {
  AdaptiveSessionFeedback,
  InputLanguageBenchmarkMetrics,
  ListeningTrainingPrescription,
} from './types';

export type OpenRouterGenerationPromptContextPackage = {
  outputTemplate: string;
  benchmarkJson: string;
  llmPrompt: string;
  compactPromptPackage: string;
  compactAdaptiveV2Context: string;
  compactBenchmarkOnlyPackage: string;
  originalAdaptivePackage: string;
  originalBenchmarkOnlyPackage: string;
};

export type OpenRouterGenerationPromptContextPackageArgs = {
  normalizedProfile: InputLanguageBenchmarkMetrics;
  sessionFeedback: AdaptiveSessionFeedback | null;
  trainingPrescription: ListeningTrainingPrescription;
};

export function buildOpenRouterGenerationPromptContextPackage({
  normalizedProfile,
  sessionFeedback,
  trainingPrescription,
}: OpenRouterGenerationPromptContextPackageArgs): OpenRouterGenerationPromptContextPackage {
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

  return {
    outputTemplate,
    benchmarkJson,
    llmPrompt,
    compactPromptPackage,
    compactAdaptiveV2Context,
    compactBenchmarkOnlyPackage: `Compact benchmark context:\n${compactBenchmark}\n\nLLM prompt:\n${llmPrompt}`,
    originalAdaptivePackage: buildBenchmarkFeedbackPromptPackage(normalizedProfile, sessionFeedback, llmPrompt, {
      activeSessionStatus: undefined,
    }),
    originalBenchmarkOnlyPackage: `Benchmark JSON context:\n${benchmarkJson}\n\nLLM prompt:\n${llmPrompt}`,
  };
}
