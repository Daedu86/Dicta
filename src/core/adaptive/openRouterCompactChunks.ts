import { isSupportedLanguage } from '../languages';
import { normalizeInputMode } from './inputModes';
import { planSemanticPhrases } from './SemanticPhrasePlanner';
import {
  buildJsonParseCandidates,
  collectDictationScriptValueCandidates,
  tryParseJsonObjectCandidate,
} from './dictationScriptJsonParsing';
import type {
  DictationScript,
  DictationScriptDifficulty,
  DictationScriptIntonationHint,
  DictationScriptPhrase,
  DictationScriptValidationResult,
} from './dictationScriptValidation';
import type {
  InputMode,
  LanguageCode,
  ListeningTrainingDurationMinutes,
  ListeningTrainingPrescription,
  PhraseBoundaryType,
  PhraseSize,
} from './types';

export const OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT = 'compact-chunks-v1';
export const OPENROUTER_DICTATION_SCRIPT_GENERATION_FORMAT = 'dictation-script-v1';

export type OpenRouterGenerationFormat =
  | typeof OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT
  | typeof OPENROUTER_DICTATION_SCRIPT_GENERATION_FORMAT;

export type CompactOpenRouterChunksPayload = {
  title?: string;
  chunks: string[];
};

export type OpenRouterScriptBuildPolicy = {
  inputMode: InputMode;
  language: LanguageCode;
  difficulty: DictationScriptDifficulty;
  durationMinutes: ListeningTrainingDurationMinutes;
  recommendedRateRange: [number, number];
  recommendedPhraseSize: PhraseSize;
  recommendedPauseMs: number;
  phraseDifficultyRange: [number, number];
};

export type CompactOpenRouterChunksParseResult =
  | { ok: true; payload: CompactOpenRouterChunksPayload; errors: [] }
  | { ok: false; payload: null; errors: string[] };

export function buildOpenRouterScriptBuildPolicy(
  trainingPrescription: ListeningTrainingPrescription,
): OpenRouterScriptBuildPolicy {
  return {
    inputMode: trainingPrescription.inputMode,
    language: trainingPrescription.language,
    difficulty: trainingPrescription.difficulty,
    durationMinutes: trainingPrescription.durationMinutes,
    recommendedRateRange: trainingPrescription.targetRateRange,
    recommendedPhraseSize: trainingPrescription.targetPhraseSize,
    recommendedPauseMs: trainingPrescription.targetPauseMs,
    phraseDifficultyRange: trainingPrescription.phraseDifficultyRange,
  };
}

export function parseCompactOpenRouterChunksJson(raw: string): CompactOpenRouterChunksParseResult {
  let firstValidationErrors: string[] | null = null;
  for (const candidate of buildJsonParseCandidates(raw)) {
    const parsed = tryParseJsonObjectCandidate(candidate);
    if (!parsed.ok) continue;
    for (const value of collectDictationScriptValueCandidates(parsed.value)) {
      const result = normalizeCompactChunksPayload(value);
      if (result.ok) return result;
      firstValidationErrors ??= result.errors;
    }
  }
  return { ok: false, payload: null, errors: firstValidationErrors ?? ['Compact chunks JSON must parse.'] };
}

export function normalizeOpenRouterScriptBuildPolicy(
  value: unknown,
  fallback: Partial<OpenRouterScriptBuildPolicy> = {},
): OpenRouterScriptBuildPolicy {
  const record = toRecord(value);
  const inputMode = normalizeInputMode(readString(record.inputMode)) ?? fallback.inputMode ?? 'browser-tts';
  const fallbackLanguage = isSupportedLanguage(fallback.language) ? fallback.language : 'en';
  const rawLanguage = readString(record.language) || fallbackLanguage;
  const language = isSupportedLanguage(rawLanguage) ? rawLanguage : fallbackLanguage;
  const difficulty = normalizeDifficulty(record.difficulty, fallback.difficulty ?? 'normal');
  const durationMinutes = normalizeDurationMinutes(record.durationMinutes, fallback.durationMinutes ?? 3);
  const recommendedRateRange = normalizeRateRange(record.recommendedRateRange, fallback.recommendedRateRange ?? [0.9, 1]);
  const recommendedPhraseSize = normalizePhraseSize(record.recommendedPhraseSize, fallback.recommendedPhraseSize ?? 'medium');
  const recommendedPauseMs = normalizePauseMs(record.recommendedPauseMs, fallback.recommendedPauseMs ?? 600);
  const phraseDifficultyRange = normalizeUnitRange(record.phraseDifficultyRange, fallback.phraseDifficultyRange ?? [0.45, 0.65]);

  return {
    inputMode,
    language,
    difficulty,
    durationMinutes,
    recommendedRateRange,
    recommendedPhraseSize,
    recommendedPauseMs,
    phraseDifficultyRange,
  };
}

export function buildDictationScriptFromCompactChunks(
  payload: CompactOpenRouterChunksPayload,
  policy: OpenRouterScriptBuildPolicy,
): DictationScriptValidationResult {
  const chunks = normalizeCompactChunks(payload.chunks);
  if (chunks.length === 0) {
    return { ok: false, script: null, errors: ['Compact chunks must include at least one non-empty chunk.'] };
  }

  const semanticPhrases = planSemanticPhrases(chunks.join(' '), policy.language, policy.recommendedPhraseSize);
  if (semanticPhrases.length === 0) {
    return { ok: false, script: null, errors: ['Compact chunks did not produce semantic phrases.'] };
  }

  const phrases: DictationScriptPhrase[] = semanticPhrases.map((phrase, index) => ({
    id: `p${String(index + 1).padStart(2, '0')}`,
    text: phrase.text,
    boundaryType: phrase.boundaryType,
    pauseAfterMs: policy.recommendedPauseMs,
    canReplayIndependently: phrase.canReplayIndependently,
    requiresContinuation: !phrase.canPauseAfter,
    semanticCompleteness: clampUnit(phrase.semanticCompleteness),
    difficulty: clampUnit(phrase.difficulty),
    emphasisWords: [],
    intonationHint: intonationHintForBoundary(phrase.boundaryType),
  }));

  const script: DictationScript = {
    title: normalizeCompactTitle(payload.title, chunks, policy.language),
    language: policy.language,
    inputMode: policy.inputMode,
    difficulty: policy.difficulty,
    estimatedDurationSec: policy.durationMinutes * 60,
    targetSkills: [],
    recommendedRateRange: policy.recommendedRateRange,
    recommendedPhraseSize: policy.recommendedPhraseSize,
    recommendedPauseMs: policy.recommendedPauseMs,
    phrases,
  };

  return { ok: true, script, errors: [] };
}

export function normalizeCompactChunks(chunks: unknown): string[] {
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const chunk of chunks) {
    if (typeof chunk !== 'string') continue;
    const text = normalizeChunkText(chunk);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
  }

  return normalized;
}

function normalizeCompactChunksPayload(value: unknown): CompactOpenRouterChunksParseResult {
  const record = toRecord(value);
  const chunks = normalizeCompactChunks(record.chunks);
  if (chunks.length === 0) {
    return { ok: false, payload: null, errors: ['chunks must be a non-empty string array.'] };
  }

  const title = readString(record.title);
  return {
    ok: true,
    payload: {
      ...(title ? { title } : {}),
      chunks,
    },
    errors: [],
  };
}

function normalizeChunkText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeCompactTitle(title: unknown, chunks: string[], language: string): string {
  const provided = readString(title);
  if (provided) return provided.slice(0, 80);

  const firstChunkWords = chunks[0]?.split(/\s+/).slice(0, 7).join(' ').replace(/[.,;:!?]+$/g, '').trim();
  if (firstChunkWords) return firstChunkWords.slice(0, 80);

  return `Generated ${String(language).toUpperCase()} practice`;
}

function intonationHintForBoundary(boundaryType: PhraseBoundaryType): DictationScriptIntonationHint {
  if (boundaryType === 'sentence') return 'falling';
  if (boundaryType === 'clause') return 'neutral';
  return 'continuation';
}

function normalizeDifficulty(value: unknown, fallback: DictationScriptDifficulty): DictationScriptDifficulty {
  return value === 'easy' || value === 'normal' || value === 'hard' ? value : fallback;
}

function normalizePhraseSize(value: unknown, fallback: PhraseSize): PhraseSize {
  return value === 'short' || value === 'medium' || value === 'long' ? value : fallback;
}

function normalizeDurationMinutes(value: unknown, fallback: ListeningTrainingDurationMinutes): ListeningTrainingDurationMinutes {
  const numeric = Math.round(Number(value));
  return isDurationMinutes(numeric) ? numeric : fallback;
}

function isDurationMinutes(value: number): value is ListeningTrainingDurationMinutes {
  return value >= 1 && value <= 10 && Number.isInteger(value);
}

function normalizeRateRange(value: unknown, fallback: [number, number]): [number, number] {
  const range = normalizeNumberPair(value);
  if (!range) return fallback;
  const low = Math.max(0.1, Math.min(2, range[0]));
  const high = Math.max(0.1, Math.min(2, range[1]));
  return low <= high ? [round2(low), round2(high)] : [round2(high), round2(low)];
}

function normalizeUnitRange(value: unknown, fallback: [number, number]): [number, number] {
  const range = normalizeNumberPair(value);
  if (!range) return fallback;
  const low = clampUnit(range[0]);
  const high = clampUnit(range[1]);
  return low <= high ? [round2(low), round2(high)] : [round2(high), round2(low)];
}

function normalizeNumberPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const low = Number(value[0]);
  const high = Number(value[1]);
  return Number.isFinite(low) && Number.isFinite(high) ? [low, high] : null;
}

function normalizePauseMs(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : fallback;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, round2(value)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
