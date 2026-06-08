const DEFAULT_WORDS_PER_SECOND = 2.6;

export type SessionDurationInput = {
  inputMode?: string;
  ttsText?: string;
  telemetry?: {
    ttsChunks?: Array<{ durationSec?: number }>;
  };
  voiceDurationSec?: number | null;
};

export function estimateSessionVoiceDurationSec(session: SessionDurationInput): number {
  if (typeof session.voiceDurationSec === 'number' && Number.isFinite(session.voiceDurationSec) && session.voiceDurationSec > 0) {
    return session.voiceDurationSec;
  }

  const chunkDuration = sumChunkDurations(session.telemetry?.ttsChunks ?? []);
  if (chunkDuration > 0) return chunkDuration;

  return estimateTextDurationSec(session.ttsText ?? '');
}

export function sumChunkDurations(chunks: Array<{ durationSec?: number }>): number {
  return chunks.reduce((sum, chunk) => {
    const duration = Number(chunk.durationSec);
    return Number.isFinite(duration) && duration > 0 ? sum + duration : sum;
  }, 0);
}

export function estimateTextDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, words / DEFAULT_WORDS_PER_SECOND);
}
