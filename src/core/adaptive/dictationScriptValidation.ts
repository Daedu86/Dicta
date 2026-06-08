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

const BOUNDARY_TYPES: PhraseBoundaryType[] = ['sentence', 'clause', 'minor', 'unsafe'];
const DIFFICULTIES: DictationScriptDifficulty[] = ['easy', 'normal', 'hard'];
const PHRASE_SIZES: PhraseSize[] = ['short', 'medium', 'long'];
const INTONATION_HINTS: DictationScriptIntonationHint[] = ['falling', 'continuation', 'contrast', 'question', 'neutral'];
const ACTIVE_SCRIPT_INPUT_MODES = ['browser-tts'] as const;
type UnknownRecord = Record<string, unknown>;

export function parseDictationScriptJson(raw: string): DictationScriptValidationResult {
  const candidates = buildJsonParseCandidates(raw);
  let firstValidationErrors: string[] | null = null;
  for (const candidate of candidates) {
    const parsed = tryParseJsonCandidate(candidate);
    if (!parsed.ok) continue;
    for (const value of collectDictationScriptValueCandidates(parsed.value)) {
      const result = validateDictationScript(value);
      if (result.ok) return result;
      firstValidationErrors ??= result.errors;
    }
  }
  return { ok: false, script: null, errors: firstValidationErrors ?? ['JSON must parse.'] };
}

export function extractJsonObjectText(raw: string): string | null {
  return extractJsonObjectTexts(raw)[0] ?? null;
}

function extractJsonObjectTexts(raw: string): string[] {
  const text = stripMarkdownJsonFence(raw).trim();
  if (!text) return [];

  const candidates: string[] = [];
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    const candidate = extractBalancedObjectAt(text, start);
    if (candidate && isJsonObjectText(candidate)) candidates.push(candidate);
  }

  return [...new Set(candidates)];
}

function extractBalancedObjectAt(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  return null;
}

function isJsonObjectText(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

export function validateDictationScript(value: unknown): DictationScriptValidationResult {
  const errors = collectValidationErrors(value);
  if (errors.length > 0) {
    return { ok: false, script: null, errors };
  }
  return { ok: true, script: normalizeDictationScript(value), errors: [] };
}

export function normalizeDictationScript(value: unknown): DictationScript {
  const input = value as UnknownRecord;
  const phrases = Array.isArray(input.phrases) ? input.phrases : [];
  return {
    title: String(input.title).trim(),
    language: String(input.language).trim(),
    inputMode: String(input.inputMode).trim(),
    difficulty: isDifficulty(input.difficulty) ? input.difficulty : 'normal',
    estimatedDurationSec: finiteOr(input.estimatedDurationSec, 90),
    targetSkills: Array.isArray(input.targetSkills) ? input.targetSkills.filter((skill: unknown): skill is string => typeof skill === 'string') : [],
    recommendedRateRange: normalizeRateRange(input.recommendedRateRange),
    recommendedPhraseSize: isPhraseSize(input.recommendedPhraseSize) ? input.recommendedPhraseSize : 'medium',
    recommendedPauseMs: finiteOr(input.recommendedPauseMs, 600),
    phrases: phrases.map((phrase) => {
      const candidate = phrase as UnknownRecord;
      return {
        id: String(candidate.id).trim(),
        text: String(candidate.text).trim(),
        boundaryType: candidate.boundaryType as PhraseBoundaryType,
        pauseAfterMs: Number(candidate.pauseAfterMs),
        canReplayIndependently: Boolean(candidate.canReplayIndependently),
        requiresContinuation: Boolean(candidate.requiresContinuation),
        semanticCompleteness: Number(candidate.semanticCompleteness),
        difficulty: Number(candidate.difficulty),
        emphasisWords: Array.isArray(candidate.emphasisWords)
          ? candidate.emphasisWords.filter((word: unknown): word is string => typeof word === 'string')
          : [],
        intonationHint: isIntonationHint(candidate.intonationHint) ? candidate.intonationHint : 'neutral',
      };
    }),
  };
}

function buildJsonParseCandidates(raw: string): string[] {
  const candidates = [raw.trim(), stripMarkdownJsonFence(raw).trim(), ...extractJsonObjectTexts(raw)]
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  return [...new Set(candidates)];
}

function collectDictationScriptValueCandidates(value: unknown, depth = 0): unknown[] {
  const candidates: unknown[] = [value];
  if (depth >= 4) return candidates;

  if (typeof value === 'string') {
    const parsed = tryParseJsonCandidate(value);
    if (parsed.ok && parsed.value !== value) {
      candidates.push(...collectDictationScriptValueCandidates(parsed.value, depth + 1));
    }
    return candidates;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      candidates.push(...collectDictationScriptValueCandidates(item, depth + 1));
    }
    return candidates;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value as UnknownRecord)) {
      candidates.push(...collectDictationScriptValueCandidates(item, depth + 1));
    }
  }

  return candidates;
}

function stripMarkdownJsonFence(raw: string): string {
  const text = raw.trim();
  const fenced = text.match(/^```\s*(?:json|jsonc)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ?? text;
}

type JsonParseCandidateResult =
  | { ok: true; value: unknown }
  | { ok: false };

function tryParseJsonCandidate(value: string, depth = 0): JsonParseCandidateResult {
  const text = value.replace(/^\uFEFF/, '').trim();
  const candidates = [...new Set([text, removeTrailingJsonCommas(text)].filter(Boolean))];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (depth < 1 && typeof parsed === 'string') {
        const nested = tryParseJsonCandidate(parsed, depth + 1);
        if (nested.ok) return nested;
      }
      return { ok: true, value: parsed };
    } catch {
      // Try the next repaired candidate. Some free models emit prose, fences, or trailing commas.
    }
  }
  return { ok: false };
}

function removeTrailingJsonCommas(value: string): string {
  let output = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }
    if (char === ',') {
      let nextIndex = index + 1;
      while (nextIndex < value.length && /\s/.test(value[nextIndex])) nextIndex += 1;
      if (value[nextIndex] === '}' || value[nextIndex] === ']') continue;
    }
    output += char;
  }
  return output;
}

function collectValidationErrors(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') {
    return ['Script must be a JSON object.'];
  }
  const input = value as UnknownRecord;

  if (typeof input.title !== 'string' || input.title.trim().length === 0) errors.push('title must exist.');
  if (typeof input.language !== 'string' || input.language.trim().length === 0) errors.push('language must exist.');
  if (typeof input.inputMode !== 'string' || input.inputMode.trim().length === 0) {
    errors.push('inputMode must exist.');
  } else if (!ACTIVE_SCRIPT_INPUT_MODES.includes(input.inputMode.trim() as (typeof ACTIVE_SCRIPT_INPUT_MODES)[number])) {
    errors.push('inputMode must be browser-tts.');
  }
  if (!Array.isArray(input.phrases) || input.phrases.length === 0) {
    errors.push('phrases must be a non-empty array.');
    return errors;
  }

  input.phrases.forEach((phrase: unknown, index: number) => {
    if (!phrase || typeof phrase !== 'object') {
      errors.push(`phrases[${index}] must be an object.`);
      return;
    }
    const candidate = phrase as UnknownRecord;
    if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) errors.push(`phrases[${index}].id must exist.`);
    if (typeof candidate.text !== 'string' || candidate.text.trim().length === 0) errors.push(`phrases[${index}].text must exist.`);
    if (!BOUNDARY_TYPES.includes(candidate.boundaryType as PhraseBoundaryType)) errors.push(`phrases[${index}].boundaryType is invalid.`);
    if (!Number.isFinite(Number(candidate.pauseAfterMs))) errors.push(`phrases[${index}].pauseAfterMs must be a finite number.`);
    if (!isUnitNumber(candidate.semanticCompleteness)) errors.push(`phrases[${index}].semanticCompleteness must be between 0 and 1.`);
    if (!isUnitNumber(candidate.difficulty)) errors.push(`phrases[${index}].difficulty must be between 0 and 1.`);
    if (typeof candidate.canReplayIndependently !== 'boolean') errors.push(`phrases[${index}].canReplayIndependently must be boolean.`);
    if (typeof candidate.requiresContinuation !== 'boolean') errors.push(`phrases[${index}].requiresContinuation must be boolean.`);
  });

  return errors;
}

function normalizeRateRange(value: unknown): [number, number] {
  if (!Array.isArray(value) || value.length < 2) return [0.9, 1.0];
  const min = Number(value[0]);
  const max = Number(value[1]);
  return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : [0.9, 1.0];
}

function finiteOr(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isUnitNumber(value: unknown): boolean {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1;
}

function isDifficulty(value: unknown): value is DictationScriptDifficulty {
  return DIFFICULTIES.includes(value as DictationScriptDifficulty);
}

function isPhraseSize(value: unknown): value is PhraseSize {
  return PHRASE_SIZES.includes(value as PhraseSize);
}

function isIntonationHint(value: unknown): value is DictationScriptIntonationHint {
  return INTONATION_HINTS.includes(value as DictationScriptIntonationHint);
}
