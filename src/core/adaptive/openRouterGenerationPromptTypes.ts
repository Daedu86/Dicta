import type { DictationScriptDifficulty } from './dictationScriptValidation';
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
  topicContext?: string;
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
