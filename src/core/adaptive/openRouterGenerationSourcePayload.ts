import type { OpenRouterGeneratePromptSource } from './openRouterGenerationPromptTypes';

export type OpenRouterSourcePayloadArgs = {
  promptSource: OpenRouterGeneratePromptSource;
  hasSessionFeedback: boolean;
  compactPromptPackage: string;
  compactBenchmarkOnlyPackage: string;
  originalAdaptivePackage: string;
  originalBenchmarkOnlyPackage: string;
  llmPrompt: string;
};

export function selectOpenRouterSourcePayload({
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
