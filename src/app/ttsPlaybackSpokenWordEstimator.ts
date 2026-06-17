import {
  estimateTtsSpokenWordIndex as estimateTtsSpokenWordIndexForState,
} from './useTtsPlaybackProgressEstimator';
import type { Transcript } from '../types/dictation';
import type { TtsStatus } from './sessionTypes';
import type { WritableRef } from './useTtsPlaybackMetricsRuntimeTypes';

export type TtsSpokenWordEstimator = (now?: number) => number;

export type TtsSpokenWordEstimatorOptions = {
  ttsTranscript: Transcript | null;
  ttsStatus: TtsStatus;
  ttsSpeechRate: number;
  ttsChunkStartMsRef: WritableRef<number | null>;
  ttsChunkWordCountRef: WritableRef<number>;
  ttsChunkStartWordIndexRef: WritableRef<number>;
  ttsCompletedSourceWordsRef: WritableRef<number>;
  baseWordsPerSecond: number;
  nowMs: () => number;
};

export function createTtsSpokenWordEstimator({
  ttsTranscript,
  ttsStatus,
  ttsSpeechRate,
  ttsChunkStartMsRef,
  ttsChunkWordCountRef,
  ttsChunkStartWordIndexRef,
  ttsCompletedSourceWordsRef,
  baseWordsPerSecond,
  nowMs,
}: TtsSpokenWordEstimatorOptions): TtsSpokenWordEstimator {
  return (now = nowMs()) =>
    estimateTtsSpokenWordIndexForState({
      sourceWordCount: ttsTranscript?.words.length ?? 0,
      ttsStatus,
      now,
      ttsChunkStartMs: ttsChunkStartMsRef.current,
      ttsSpeechRate,
      ttsChunkWordCount: ttsChunkWordCountRef.current,
      ttsChunkStartWordIndex: ttsChunkStartWordIndexRef.current,
      ttsCompletedSourceWords: ttsCompletedSourceWordsRef.current,
      baseWordsPerSecond,
    });
}
