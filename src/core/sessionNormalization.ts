import type { SessionTelemetry } from '../types/dictation';
import { isSupportedLanguage, type SupportedLanguage } from './languages';

// Persisted legacy storage value for Browser TTS sessions. Adaptive/script profiles use `browser-tts`.
export type SessionInputMode = 'input2' | string;
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

type UnknownRecord = Record<string, unknown>;

type CommonRestoredSessionFields = {
  ttsText: string;
  ttsPracticeText: string;
  metrics: UnknownRecord;
};

function isInput2Language(value: unknown): value is Input2Language {
  return isSupportedLanguage(value);
}

function numberOr(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function stringOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function safeLength(value: unknown): number {
  return typeof value === 'string' ? value.length : 0;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function normalizeTrend(value: unknown): 'improving' | 'stable' | 'declining' {
  return value === 'improving' || value === 'declining' || value === 'stable' ? value : 'stable';
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

export function normalizeRateDistribution(input: unknown): Array<{ rate: number; seconds: number }> {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const candidate = entry as { rate?: unknown; seconds?: unknown };
        const rate = typeof candidate.rate === 'number' ? candidate.rate : Number(candidate.rate);
        const seconds = typeof candidate.seconds === 'number' ? candidate.seconds : Number(candidate.seconds);
        if (!Number.isFinite(rate) || !Number.isFinite(seconds)) return null;
        return { rate, seconds };
      })
      .filter((value): value is { rate: number; seconds: number } => Boolean(value))
      .sort((a, b) => a.rate - b.rate);
  }

  if (typeof input === 'object') {
    const record = input as Record<string, number>;
    return Object.entries(record)
      .map(([rateKey, seconds]) => ({ rate: Number(rateKey), seconds: Number(seconds) }))
      .filter((entry) => Number.isFinite(entry.rate) && Number.isFinite(entry.seconds))
      .sort((a, b) => a.rate - b.rate);
  }

  return [];
}

export function cloneTelemetry(telemetry: unknown): SessionTelemetry {
  if (!telemetry) {
    return {
      startedAt: '',
      lagSeries: [],
      wpmSeries: [],
      accuracySeries: [],
      actions: [],
      ttsChunks: [],
      repeatCount: 0,
      rateDistribution: [],
    };
  }

  const input = asRecord(telemetry);
  const normalizedRateDistribution = normalizeRateDistribution(input.rateDistribution ?? input.timeAtRate ?? {});

  return {
    startedAt: typeof input.startedAt === 'string' ? input.startedAt : '',
    finishedAt: typeof input.finishedAt === 'string' ? input.finishedAt : undefined,
    lagSeries: Array.isArray(input.lagSeries) ? input.lagSeries.filter((value): value is number => typeof value === 'number') : [],
    wpmSeries: Array.isArray(input.wpmSeries) ? input.wpmSeries.filter((value): value is number => typeof value === 'number') : [],
    accuracySeries: Array.isArray(input.accuracySeries)
      ? input.accuracySeries.filter((value): value is number => typeof value === 'number')
      : [],
    actions: Array.isArray(input.actions) ? (input.actions as SessionTelemetry['actions']) : [],
    ttsChunks: Array.isArray(input.ttsChunks) ? (input.ttsChunks as SessionTelemetry['ttsChunks']) : [],
    repeatCount: numberOr(input.repeatCount, 0),
    rateDistribution: normalizedRateDistribution,
  };
}

export function hasFinalizedAttemptTelemetry(telemetry: unknown): boolean {
  const normalized = cloneTelemetry(telemetry);
  return Boolean(normalized.finishedAt || normalized.actions.some((entry) => entry.action === 'submit'));
}

function hasNonEmptyText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isSubmittedFinishedAttempt(payload: unknown): boolean {
  const session = asRecord(payload);
  if (session.status !== 'finished') return false;

  if (hasFinalizedAttemptTelemetry(session.telemetry)) return true;
  if (session.inputMode !== 'input2') return false;

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
  if (session.inputMode === 'input2') {
    return { ttsLanguage: session.ttsLanguage };
  }
  return { ttsLanguage: null };
}

export function normalizeSessionModeData(session: unknown): SessionModeData {
  const input = asRecord(session);
  const inputMode = typeof input.inputMode === 'string' ? input.inputMode : 'input2';

  const existingModeData = input.modeData && typeof input.modeData === 'object' ? (input.modeData as UnknownRecord) : null;
  const existingInput2 =
    existingModeData?.input2 && typeof existingModeData.input2 === 'object' ? (existingModeData.input2 as UnknownRecord) : null;
  const textSummary = input.textSummary && typeof input.textSummary === 'object' ? (input.textSummary as UnknownRecord) : null;

  const input2LanguageRaw = existingInput2?.language ?? input.ttsLanguage;
  const input2Language = isInput2Language(input2LanguageRaw) ? input2LanguageRaw : null;
  const ttsTextLength = numberOr(existingInput2?.textLength ?? textSummary?.ttsTextLength ?? safeLength(input.ttsText), 0);

  return {
    input2:
      inputMode === 'input2'
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
