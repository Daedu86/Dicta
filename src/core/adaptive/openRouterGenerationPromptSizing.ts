import type {
  OpenRouterDurationMinutes,
  OpenRouterPromptSizeEstimate,
} from './openRouterGenerationPromptTypes';

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
    case 5:
      return 6_000;
    case 6:
      return 6_000;
  }
}
