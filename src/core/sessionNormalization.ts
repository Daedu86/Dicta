import type { SessionTelemetry } from '../types/dictation';
import { getKokoroProcessedLanguage, isKokoroNativeLanguage } from './kokoroSupport';

export type SessionInputMode = 'input1' | 'input2' | 'input3' | 'input4';
export type Input1Language = 'en' | 'de' | 'es';
export type Input2Language = 'en' | 'de' | 'es';

export type SessionLanguageFields = {
  inputMode: SessionInputMode;
  transcriptionLanguage: Input1Language | null;
  ttsLanguage: Input2Language | null;
  kokoroLanguage: Input2Language | null;
};

export type Input1ModeData = {
  type: 'transcription';
  language: Input1Language | null;
  transcriptWords: number;
  inputTextLength: number;
};

export type Input2ModeData = {
  type: 'builtInTts';
  language: Input2Language | null;
  textLength: number;
};

export type Input3ModeData = {
  type: 'kokoro';
  language: Input2Language | null;
  textLength: number;
  nativeLanguage: boolean;
  processedLanguage: 'en' | 'es' | null;
  fallback?: string;
};

export type SessionModeData = {
  input1: Input1ModeData | null;
  input2: Input2ModeData | null;
  input3: Input3ModeData | null;
};

function isInputMode(value: unknown): value is SessionInputMode {
  return value === 'input1' || value === 'input2' || value === 'input3' || value === 'input4';
}

function isInput1Language(value: unknown): value is Input1Language {
  return value === 'en' || value === 'de' || value === 'es';
}

function isInput2Language(value: unknown): value is Input2Language {
  return value === 'en' || value === 'de' || value === 'es';
}

function numberOr(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeLength(value: unknown): number {
  return typeof value === 'string' ? value.length : 0;
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

  const input = telemetry as any;
  const normalizedRateDistribution = normalizeRateDistribution(input.rateDistribution ?? input.timeAtRate ?? {});

  return {
    startedAt: input.startedAt ?? '',
    finishedAt: input.finishedAt,
    lagSeries: [...(input.lagSeries ?? [])],
    wpmSeries: [...(input.wpmSeries ?? [])],
    accuracySeries: [...(input.accuracySeries ?? [])],
    actions: [...(input.actions ?? [])],
    ttsChunks: [...(input.ttsChunks ?? [])],
    repeatCount: input.repeatCount ?? 0,
    rateDistribution: normalizedRateDistribution,
  };
}

export function normalizeSessionLanguages(
  session: Pick<SessionLanguageFields, 'inputMode' | 'transcriptionLanguage' | 'ttsLanguage' | 'kokoroLanguage'>,
): {
  transcriptionLanguage: SessionLanguageFields['transcriptionLanguage'] | null;
  ttsLanguage: SessionLanguageFields['ttsLanguage'] | null;
  kokoroLanguage: SessionLanguageFields['kokoroLanguage'] | null;
} {
  if (session.inputMode === 'input1') {
    return { transcriptionLanguage: session.transcriptionLanguage, ttsLanguage: null, kokoroLanguage: null };
  }
  if (session.inputMode === 'input2') {
    return { transcriptionLanguage: null, ttsLanguage: session.ttsLanguage, kokoroLanguage: null };
  }
  if (session.inputMode === 'input3') {
    return { transcriptionLanguage: null, ttsLanguage: null, kokoroLanguage: session.kokoroLanguage };
  }
  // input4 reuses TTS language and settings
  return { transcriptionLanguage: null, ttsLanguage: session.ttsLanguage, kokoroLanguage: null };
}

export function normalizeSessionModeData(session: unknown): SessionModeData {
  const input = session && typeof session === 'object' ? (session as any) : {};
  const inputMode: SessionInputMode = isInputMode(input.inputMode) ? input.inputMode : 'input1';

  const existingModeData = input.modeData && typeof input.modeData === 'object' ? (input.modeData as any) : null;
  const existingInput1 = existingModeData?.input1 && typeof existingModeData.input1 === 'object' ? existingModeData.input1 : null;
  const existingInput2 = existingModeData?.input2 && typeof existingModeData.input2 === 'object' ? existingModeData.input2 : null;
  const existingInput3 = existingModeData?.input3 && typeof existingModeData.input3 === 'object' ? existingModeData.input3 : null;

  const textSummary = input.textSummary && typeof input.textSummary === 'object' ? (input.textSummary as any) : null;

  const input1LanguageRaw = existingInput1?.language ?? input.transcriptionLanguage;
  const input2LanguageRaw = existingInput2?.language ?? input.ttsLanguage;
  const input3LanguageRaw = existingInput3?.language ?? input.kokoroLanguage;

  const input1Language = isInput1Language(input1LanguageRaw) ? input1LanguageRaw : null;
  const input2Language = isInput2Language(input2LanguageRaw) ? input2LanguageRaw : null;
  const input3Language = isInput2Language(input3LanguageRaw) ? input3LanguageRaw : null;

  const transcriptWords =
    numberOr(
      existingInput1?.transcriptWords ??
        textSummary?.transcriptWords ??
        (input.transcript?.words?.length ?? 0),
      0,
    );
  const inputTextLength = numberOr(existingInput1?.inputTextLength ?? textSummary?.inputTextLength ?? safeLength(input.inputText), 0);
  const ttsTextLength = numberOr(existingInput2?.textLength ?? textSummary?.ttsTextLength ?? safeLength(input.ttsText), 0);
  const kokoroTextLength = numberOr(existingInput3?.textLength ?? textSummary?.kokoroTextLength ?? safeLength(input.kokoroText), 0);

  const modeData: SessionModeData = {
    input1: null,
    input2: null,
    input3: null,
  };

  if (inputMode === 'input1') {
    modeData.input1 = {
      type: 'transcription',
      language: input1Language,
      transcriptWords,
      inputTextLength,
    };
  } else if (inputMode === 'input2' || inputMode === 'input4') {
    modeData.input2 = {
      type: 'builtInTts',
      language: input2Language,
      textLength: ttsTextLength,
    };
  } else if (inputMode === 'input3') {
    const latestKokoroChunk =
      Array.isArray(input.kokoroChunks) && input.kokoroChunks.length > 0
        ? input.kokoroChunks[input.kokoroChunks.length - 1]
        : null;
    const language = input3Language;
    modeData.input3 = {
      type: 'kokoro',
      language,
      textLength: kokoroTextLength,
      nativeLanguage: latestKokoroChunk?.nativeLanguage ?? isKokoroNativeLanguage(language),
      processedLanguage: latestKokoroChunk?.processedLanguage ?? getKokoroProcessedLanguage(language),
      ...(latestKokoroChunk?.fallback ? { fallback: latestKokoroChunk.fallback } : {}),
    };
  }

  return modeData;
}

export function normalizeSessionForPersistence<T extends SessionLanguageFields & { telemetry: unknown }>(
  session: T,
): T & { telemetry: SessionTelemetry } {
  const normalizedLanguages = normalizeSessionLanguages(session);
  return {
    ...session,
    transcriptionLanguage: normalizedLanguages.transcriptionLanguage,
    ttsLanguage: normalizedLanguages.ttsLanguage,
    kokoroLanguage: normalizedLanguages.kokoroLanguage,
    telemetry: cloneTelemetry(session.telemetry),
  };
}
