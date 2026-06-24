import type { OpenRouterDurationMinutes } from './adaptive/openRouterGenerationPrompt';
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
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6;
}
