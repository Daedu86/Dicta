import { parseDictationScriptJson, type DictationScriptValidationResult } from '../../core/adaptive/dictationScriptValidation';
import { normalizeInputMode } from '../../core/adaptive/inputModes';
import type { InputMode } from '../../core/adaptive/types';
import type { BenchmarkLanguageButton } from './types';

export function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }
  return trimmed;
}

export function validateGeneratedScriptForTarget(
  raw: string,
  targetInputMode: InputMode,
  targetLanguage: BenchmarkLanguageButton,
): DictationScriptValidationResult {
  const result = parseDictationScriptJson(raw);
  if (!result.ok) return result;
  const normalizedInputMode = normalizeInputMode(String(result.script.inputMode).trim().toLowerCase().replace(/_/g, '-'));
  const normalizedLanguage = String(result.script.language).trim().toLowerCase();
  const errors: string[] = [];
  if (normalizedInputMode !== targetInputMode) {
    errors.push(`inputMode must be exactly ${targetInputMode}.`);
  }
  if (normalizedLanguage !== targetLanguage) {
    errors.push(`language must be exactly ${targetLanguage}.`);
  }
  if (errors.length > 0) {
    return { ok: false, script: null, errors };
  }
  return result;
}
