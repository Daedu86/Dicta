import type { OpenRouterDurationMinutes } from './adaptive/openRouterGenerationPrompt';
import {
  OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT,
  OPENROUTER_DICTATION_SCRIPT_GENERATION_FORMAT,
  normalizeOpenRouterScriptBuildPolicy,
  type OpenRouterGenerationFormat,
} from './adaptive/openRouterCompactChunks';
import type { LanguageCode } from './adaptive/types';
import { normalizeInputMode } from './adaptive/inputModes';
import { isSupportedLanguage } from './languages';
import type { ActiveOpenRouterJob } from './openRouterJobTypes';
import {
  asOpenRouterRecord,
  openRouterFiniteNumberField,
  openRouterStringField,
} from './openRouterJobRecordUtils';

export function normalizeActiveOpenRouterJob(value: unknown): ActiveOpenRouterJob | null {
  const record = asOpenRouterRecord(value);
  const jobId = openRouterStringField(record, 'jobId');
  const model = openRouterStringField(record, 'model');
  const slotLabel = openRouterStringField(record, 'slotLabel');
  const inputMode = openRouterStringField(record, 'inputMode');
  const language = openRouterStringField(record, 'language');
  const durationMinutes = Number(record.durationMinutes);
  const startedAt = openRouterStringField(record, 'startedAt');
  const canonicalInputMode = normalizeInputMode(inputMode);

  if (
    !jobId ||
    !model ||
    !slotLabel ||
    !isActiveInputMode(inputMode) ||
    !canonicalInputMode ||
    !isLanguage(language) ||
    !isDuration(durationMinutes) ||
    !startedAt
  ) {
    return null;
  }

  const targetDifficulty = openRouterStringField(record, 'targetDifficulty');
  const generationFormat = normalizeGenerationFormat(openRouterStringField(record, 'generationFormat'));
  const promptMode = openRouterStringField(record, 'promptMode');
  const promptCharacterCount = openRouterFiniteNumberField(record, 'promptCharacterCount');
  const promptApproximateTokenCount = openRouterFiniteNumberField(record, 'promptApproximateTokenCount');
  const origin = openRouterStringField(record, 'origin');
  const customSlotId = openRouterStringField(record, 'customSlotId');

  return {
    jobId,
    model,
    slotLabel,
    inputMode: canonicalInputMode,
    language,
    durationMinutes,
    ...(targetDifficulty === 'easy' || targetDifficulty === 'normal' || targetDifficulty === 'hard' ? { targetDifficulty } : {}),
    ...(generationFormat ? { generationFormat } : {}),
    ...(generationFormat === OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT
      ? {
          scriptBuildPolicy: normalizeOpenRouterScriptBuildPolicy(record.scriptBuildPolicy, {
            inputMode: canonicalInputMode,
            language,
            durationMinutes,
            ...(targetDifficulty === 'easy' || targetDifficulty === 'normal' || targetDifficulty === 'hard'
              ? { difficulty: targetDifficulty }
              : {}),
          }),
        }
      : {}),
    ...(promptMode ? { promptMode } : {}),
    ...(promptCharacterCount !== null ? { promptCharacterCount } : {}),
    ...(promptApproximateTokenCount !== null ? { promptApproximateTokenCount } : {}),
    ...(origin === 'direct-training' || origin === 'custom-workspace' ? { origin } : {}),
    ...(customSlotId === 'prompt1' || customSlotId === 'prompt2' ? { customSlotId } : {}),
    startedAt,
  };
}

function isActiveInputMode(value: string): boolean {
  return value === 'browser-tts';
}

function isLanguage(value: string): value is LanguageCode {
  return isSupportedLanguage(value);
}

function isDuration(value: number): value is OpenRouterDurationMinutes {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

function normalizeGenerationFormat(value: string): OpenRouterGenerationFormat | null {
  if (value === OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT) return OPENROUTER_COMPACT_CHUNKS_GENERATION_FORMAT;
  if (value === OPENROUTER_DICTATION_SCRIPT_GENERATION_FORMAT) return OPENROUTER_DICTATION_SCRIPT_GENERATION_FORMAT;
  return null;
}
