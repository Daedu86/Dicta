import {
  buildJsonParseCandidates,
  collectDictationScriptValueCandidates,
  extractJsonObjectText,
  tryParseJsonObjectCandidate,
} from './dictationScriptJsonParsing';
import {
  collectDictationScriptValidationErrors,
  normalizeDictationScriptValue,
} from './dictationScriptSchema';
import type { InputMode, PhraseBoundaryType, PhraseSize } from './types';

export type DictationScriptDifficulty = 'easy' | 'normal' | 'hard';
export type DictationScriptIntonationHint = 'falling' | 'continuation' | 'contrast' | 'question' | 'neutral';

export interface DictationScriptPhrase {
  id: string;
  text: string;
  boundaryType: PhraseBoundaryType;
  pauseAfterMs: number;
  canReplayIndependently: boolean;
  requiresContinuation: boolean;
  semanticCompleteness: number;
  difficulty: number;
  emphasisWords: string[];
  intonationHint: DictationScriptIntonationHint;
}

export interface DictationScript {
  title: string;
  language: string;
  inputMode: InputMode | string;
  difficulty: DictationScriptDifficulty;
  estimatedDurationSec: number;
  targetSkills: string[];
  recommendedRateRange: [number, number];
  recommendedPhraseSize: PhraseSize;
  recommendedPauseMs: number;
  phrases: DictationScriptPhrase[];
}

export type DictationScriptValidationResult =
  | { ok: true; script: DictationScript; errors: [] }
  | { ok: false; script: null; errors: string[] };

export { extractJsonObjectText };

export function parseDictationScriptJson(raw: string): DictationScriptValidationResult {
  const candidates = buildJsonParseCandidates(raw);
  let firstValidationErrors: string[] | null = null;
  for (const candidate of candidates) {
    const parsed = tryParseJsonObjectCandidate(candidate);
    if (!parsed.ok) continue;
    for (const value of collectDictationScriptValueCandidates(parsed.value)) {
      const result = validateDictationScript(value);
      if (result.ok) return result;
      firstValidationErrors ??= result.errors;
    }
  }
  return { ok: false, script: null, errors: firstValidationErrors ?? ['JSON must parse.'] };
}

export function validateDictationScript(value: unknown): DictationScriptValidationResult {
  const errors = collectDictationScriptValidationErrors(value);
  if (errors.length > 0) {
    return { ok: false, script: null, errors };
  }
  return { ok: true, script: normalizeDictationScript(value), errors: [] };
}

export function normalizeDictationScript(value: unknown): DictationScript {
  return normalizeDictationScriptValue(value);
}
