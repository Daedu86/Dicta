import type { PlannedBrowserTtsChunk } from '../inputs/browserTts/ttsDynamicChunkPlanner';
import {
  computeBrowserTtsChunkCorrectionPressure,
  computeBrowserTtsChunkListeningPrecision,
} from './browserTtsChunkListeningMetrics';
import { buildBrowserTtsTelemetry } from './browserTtsPlaybackTelemetry';
import type { BrowserTtsPlaybackPlanInput } from './browserTtsPlaybackPlanTypes';

type BrowserTtsPlanAccuracySnapshot = {
  sessionAccuracy: number;
  chunkAccuracy: number;
  rollingAccuracyLast3: number;
  rollingAccuracyLast5: number;
};

type BuildBrowserTtsPlanChunkTelemetryInput = {
  input: BrowserTtsPlaybackPlanInput;
  chunk: PlannedBrowserTtsChunk;
  accuracy: BrowserTtsPlanAccuracySnapshot;
  rate: number;
  nextUnsafeChunkCount: number;
};

export function buildBrowserTtsPlanChunkTelemetry({
  input,
  chunk,
  accuracy,
  rate,
  nextUnsafeChunkCount,
}: BuildBrowserTtsPlanChunkTelemetryInput) {
  const {
    language,
    livePracticeEvaluation,
    liveSignal,
    ttsPlaybackPauseMs,
    sourceWordCount,
    chunkIndex,
  } = input;
  const {
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
  } = accuracy;

  return buildBrowserTtsTelemetry({
    phraseId: `tts-${chunkIndex}-chunk`,
    sourceWordCount,
    estimatedSpokenWordIndex: chunk.startWordIndex,
    livePracticeEvaluation,
    liveSignal,
    unsafeChunkCount: nextUnsafeChunkCount,
    sessionAccuracy,
    chunkAccuracy,
    rollingAccuracyLast3,
    rollingAccuracyLast5,
    listeningPrecision: computeBrowserTtsChunkListeningPrecision({
      livePracticeEvaluation,
      language,
      chunk,
    }),
    correctionPressure: computeBrowserTtsChunkCorrectionPressure(livePracticeEvaluation, chunk),
    pauseMs: ttsPlaybackPauseMs,
    phraseDifficulty: chunk.phraseDifficulty ?? 0.5,
    phraseLengthWords: chunk.wordCount,
    phraseLengthChars: chunk.text.length,
    currentPlaybackRate: rate,
    language,
    chunk,
  });
}
