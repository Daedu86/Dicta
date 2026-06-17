import type { DictationScriptDifficulty } from './dictationScriptValidation';
import type { OpenRouterDurationMinutes } from './openRouterGenerationPrompt';
import type { InputMode, LanguageCode } from './types';

export type FallbackScriptOptions = {
  inputMode: InputMode;
  language: LanguageCode;
  durationMinutes: OpenRouterDurationMinutes;
  targetDifficulty?: DictationScriptDifficulty;
  seed?: string;
};
