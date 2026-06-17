import { useMemo } from 'react';
import type { InputMode } from '../../core/adaptive/types';
import { createEmptyInputLanguageBenchmark } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import {
  buildOpenRouterGenerationPrompt,
  type OpenRouterGeneratePromptSource,
} from '../../core/adaptive/openRouterGenerationPrompt';
import { selectLatestAdaptiveSessionFeedback } from '../../core/adaptive/sessionFeedback';
import type { BenchmarkLanguageButton, OpenRouterWorkspaceProps } from './types';

type UseOpenRouterGeneratePromptDerivationsArgs = Pick<
  OpenRouterWorkspaceProps,
  | 'benchmarks'
  | 'sessionFeedbackByInputLanguage'
> & {
  generateInputMode: InputMode;
  generateLanguage: BenchmarkLanguageButton;
  generatePromptSource: OpenRouterGeneratePromptSource;
  generateDurationMinutes: 2 | 3 | 4;
};

export function useOpenRouterGeneratePromptDerivations({
  benchmarks,
  sessionFeedbackByInputLanguage,
  generateInputMode,
  generateLanguage,
  generatePromptSource,
  generateDurationMinutes,
}: UseOpenRouterGeneratePromptDerivationsArgs) {
  const generateProfile =
    benchmarks[generateInputMode]?.[generateLanguage] ?? createEmptyInputLanguageBenchmark(generateInputMode, generateLanguage);
  const generateSessionFeedback = selectLatestAdaptiveSessionFeedback(
    sessionFeedbackByInputLanguage[generateInputMode]?.[generateLanguage],
    generateInputMode,
    generateLanguage,
  );
  const generateHasBenchmarkData = generateProfile.sampleCount > 0 || generateProfile.sessionCount > 0;
  const generateHasSessionFeedback = Boolean(generateSessionFeedback);
  const generatePayloads = useMemo(
    () =>
      buildOpenRouterGenerationPrompt({
        profile: generateProfile,
        sessionFeedback: generateSessionFeedback,
        promptSource: generatePromptSource,
        durationMinutes: generateDurationMinutes,
        userIntent: 'auto',
      }),
    [generateDurationMinutes, generateProfile, generatePromptSource, generateSessionFeedback],
  );

  return {
    generatePayloads,
    generateHasBenchmarkData,
    generateHasSessionFeedback,
  };
}
