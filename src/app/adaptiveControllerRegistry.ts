import { AdaptiveDictationController } from '../core/adaptive/AdaptiveDictationController';
import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import type { InputMode, LanguageCode } from '../core/adaptive/types';

export type ScopedAdaptiveControllerRegistry = Record<string, AdaptiveDictationController>;

export function buildAdaptiveControllerScopeKey(inputMode: InputMode, language: LanguageCode): string {
  return `${inputMode}:${normalizeBenchmarkLanguage(language)}`;
}

export function getAdaptiveControllerForScope(
  registry: ScopedAdaptiveControllerRegistry,
  inputMode: InputMode,
  language: LanguageCode,
): AdaptiveDictationController {
  const key = buildAdaptiveControllerScopeKey(inputMode, language);
  registry[key] ??= new AdaptiveDictationController();
  return registry[key];
}
