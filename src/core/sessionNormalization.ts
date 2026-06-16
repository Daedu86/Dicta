import type { SessionTelemetry } from '../types/dictation';
import { isSupportedLanguage, type SupportedLanguage } from './languages';

// Persisted legacy storage value for Browser TTS sessions. Adaptive/script profiles use `browser-tts`.
import { BROWSER_TTS_SESSION_INPUT_MODE } from './sessionInputModes';
import type { SessionInputMode } from './sessionInputModes';
import {
  asRecord,
  hasNonEmptyText,
  normalizeTrend,
  numberOr,
  safeLength,
  stringOr,
  type UnknownRecord,
} from './sessionNormalizationPrimitives';
import { cloneTelemetry, hasFinalizedAttemptTelemetry } from './sessionTelemetryNormalization';

export { cloneTelemetry, hasFinalizedAttemptTelemetry, normalizeRateDistribution } from './sessionTelemetryNormalization';

export type Input2Language = SupportedLanguage;

export type SessionLanguageFields = {
  inputMode: SessionInputMode;
  ttsLanguage: Input2Language | null;
};

export type Input2ModeData = {
  type: 'builtInTts';
  language: Input2Language | null;
  textLength: number;
};

export type SessionModeData = {
  input2: Input2ModeData | null;
};

type CommonRestoredSessionFields = {
  ttsText: string;
  ttsPracticeText: string;
  metrics: UnknownRecord;
};

function isInput2Language(value: unknown): value is Input2Language {
  return isSupportedLanguage(value);
}

function normalizeCommonRestoredSessionFields(session: unknown): CommonRestoredSessionFields {
  const input = asRecord(session);
  const metrics = asRecord(input.metrics);

  return {
    ttsText: stringOr(input.ttsText),
    ttsPracticeText: stringOr(input.ttsPracticeText),
    metrics: {
      ...metrics,
      controllerState: typeof metrics.controllerState === 'string' ? metrics.controllerState : 'hold',
      rate: numberOr(metrics.rate, 1),
      lagSec: numberOr(metrics.lagSec, 0),
      lagWords: numberOr(metrics.lagWords, 0),
      wpm: numberOr(metrics.wpm, 0),
      accuracy: numberOr(metrics.accuracy, 0),
      trend: normalizeTrend(metrics.trend),
      score: numberOr(metrics.score, 0),
      points: numberOr(metrics.points, 0),
    },
  };
}

export function isSubmittedFinishedAttempt(payload: unknown): boolean {
  const session = asRecord(payload);
  if (session.status !== 'finished') return false;

  if (hasFinalizedAttemptTelemetry(session.telemetry)) return true;
  if (session.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE) return false;

  const metrics = asRecord(session.metrics);
  const points = numberOr(metrics.points, 0);
  const score = numberOr(metrics.score, 0);
  const wpm = numberOr(metrics.wpm, 0);
  if (points > 0 || score > 0 || wpm > 0) return true;

  const telemetry = cloneTelemetry(session.telemetry);
  if (telemetry.lagSeries.length > 0 || telemetry.wpmSeries.length > 0 || telemetry.accuracySeries.length > 0) return true;

  return hasNonEmptyText(session.ttsText) && hasNonEmptyText(session.ttsPracticeText);
}

export function normalizeSessionLanguages(
  session: Pick<SessionLanguageFields, 'inputMode' | 'ttsLanguage'>,
): {
  ttsLanguage: SessionLanguageFields['ttsLanguage'] | null;
} {
  if (session.inputMode === BROWSER_TTS_SESSION_INPUT_MODE) {
    return { ttsLanguage: session.ttsLanguage };
  }
  return { ttsLanguage: null };
}

export function normalizeSessionModeData(session: unknown): SessionModeData {
  const input = asRecord(session);
  const inputMode = typeof input.inputMode === 'string' ? input.inputMode : BROWSER_TTS_SESSION_INPUT_MODE;

  const existingModeData = input.modeData && typeof input.modeData === 'object' ? (input.modeData as UnknownRecord) : null;
  const existingInput2 =
    existingModeData?.input2 && typeof existingModeData.input2 === 'object' ? (existingModeData.input2 as UnknownRecord) : null;
  const textSummary = input.textSummary && typeof input.textSummary === 'object' ? (input.textSummary as UnknownRecord) : null;

  const input2LanguageRaw = existingInput2?.language ?? input.ttsLanguage;
  const input2Language = isInput2Language(input2LanguageRaw) ? input2LanguageRaw : null;
  const ttsTextLength = numberOr(existingInput2?.textLength ?? textSummary?.ttsTextLength ?? safeLength(input.ttsText), 0);

  return {
    input2:
      inputMode === BROWSER_TTS_SESSION_INPUT_MODE
        ? {
            type: 'builtInTts',
            language: input2Language,
            textLength: ttsTextLength,
          }
        : null,
  };
}

export function normalizeSessionForPersistence<T extends SessionLanguageFields & { telemetry: unknown }>(
  session: T,
): T & { telemetry: SessionTelemetry } {
  const normalizedLanguages = normalizeSessionLanguages(session);
  const normalizedCommonFields = normalizeCommonRestoredSessionFields(session);
  return {
    ...session,
    ...normalizedCommonFields,
    ttsLanguage: normalizedLanguages.ttsLanguage,
    telemetry: cloneTelemetry(session.telemetry),
  } as T & { telemetry: SessionTelemetry };
}
