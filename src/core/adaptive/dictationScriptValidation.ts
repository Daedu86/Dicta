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

export function parseDictationScriptJson(raw: string): DictationScriptValidationResult {
  try {
    return validateDictationScript(JSON.parse(raw));
  } catch {
    return { ok: false, script: null, errors: ['JSON must parse.'] };
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
  const input = value as any;
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
    phrases: input.phrases.map((phrase: any) => ({
      id: String(phrase.id).trim(),
      text: String(phrase.text).trim(),
      boundaryType: phrase.boundaryType,
      pauseAfterMs: Number(phrase.pauseAfterMs),
      canReplayIndependently: phrase.canReplayIndependently,
      requiresContinuation: phrase.requiresContinuation,
      semanticCompleteness: Number(phrase.semanticCompleteness),
      difficulty: Number(phrase.difficulty),
      emphasisWords: Array.isArray(phrase.emphasisWords)
        ? phrase.emphasisWords.filter((word: unknown): word is string => typeof word === 'string')
        : [],
      intonationHint: isIntonationHint(phrase.intonationHint) ? phrase.intonationHint : 'neutral',
    })),
  };
}

function collectValidationErrors(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') {
    return ['Script must be a JSON object.'];
  }
  const input = value as any;

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
    const candidate = phrase as any;
    if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) errors.push(`phrases[${index}].id must exist.`);
    if (typeof candidate.text !== 'string' || candidate.text.trim().length === 0) errors.push(`phrases[${index}].text must exist.`);
    if (!BOUNDARY_TYPES.includes(candidate.boundaryType)) errors.push(`phrases[${index}].boundaryType is invalid.`);
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
