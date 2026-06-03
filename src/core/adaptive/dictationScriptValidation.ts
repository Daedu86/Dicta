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
type UnknownRecord = Record<string, unknown>;

export function parseDictationScriptJson(raw: string): DictationScriptValidationResult {
  const candidates = buildJsonParseCandidates(raw);
  for (const candidate of candidates) {
    try {
      return validateDictationScript(JSON.parse(candidate));
    } catch {
      // Try the next candidate. Some OpenRouter free models wrap JSON in prose or markdown fences.
    }
  }
  return { ok: false, script: null, errors: ['JSON must parse.'] };
}

export function extractJsonObjectText(raw: string): string | null {
  const text = stripMarkdownJsonFence(raw).trim();
  if (!text) return null;
  if (text.startsWith('{') && text.endsWith('}')) return text;

  const start = text.indexOf('{');
  if (start < 0) return null;

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
  const candidates = [raw.trim(), stripMarkdownJsonFence(raw).trim(), extractJsonObjectText(raw) ?? '']
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  return [...new Set(candidates)];
}

function stripMarkdownJsonFence(raw: string): string {
  const text = raw.trim();
  const fenced = text.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
  return fenced?.[1] ?? text;
}

function collectValidationErrors(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') {
    return ['Script must be a JSON object.'];
  }
  const input = value as UnknownRecord;

  if (typeof input.title !== 'string' || input.title.trim().length === 0) errors.push('title must exist.');
  if (typeof input.language !== 'string' || input.language.trim().length === 0) errors.push('language must exist.');
  if (typeof input.inputMode !== 'string' || input.inputMode.trim().length === 0) errors.push('inputMode must exist.');
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
