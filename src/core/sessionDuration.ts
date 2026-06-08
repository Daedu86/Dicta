import type { SessionTelemetry } from '../types/dictation';

const TTS_BASE_WORDS_PER_SECOND = 2.6;

export type SessionDurationInput = {
  inputMode?: string;
  voiceDurationSec?: number | null;
  ttsText?: string;
  kokoroText?: string;
  kokoroChunks?: Array<{ durationSec?: number }>;
  metrics?: { rate?: number };
  telemetry?: Partial<SessionTelemetry> | null;
};

export function estimateSessionVoiceDurationSec(session: SessionDurationInput): number | null {
  const explicitDuration = finitePositiveOrNull(session.voiceDurationSec);
  if (explicitDuration !== null) return explicitDuration;

  if (session.inputMode === 'input3') {
    const chunkDuration = sumChunkDurations(session.kokoroChunks ?? []);
    if (chunkDuration !== null) return chunkDuration;
    return estimateTextDurationSec(session.kokoroText ?? '');
  }

  return estimateTextDurationSec(session.ttsText ?? '');
}

function sumChunkDurations(chunks: Array<{ durationSec?: number }>): number | null {
  const durations = chunks
    .map((chunk) => finitePositiveOrNull(chunk.durationSec))
    .filter((value): value is number => value !== null);
  if (durations.length === 0) return null;
  return durations.reduce((sum, value) => sum + value, 0);
}

function estimateTextDurationSec(text: string): number | null {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return null;
  return wordCount / TTS_BASE_WORDS_PER_SECOND;
}

function finitePositiveOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}
