import { useCallback } from 'react';
import type { TtsStatus } from './sessionTypes';
import { clamp } from './appRuntimeHelpers';

const DEFAULT_TTS_BASE_WORDS_PER_SECOND = 2.6;

type WritableRef<T> = {
  current: T;
};

export type TtsSpokenWordEstimateInput = {
  sourceWordCount: number;
  ttsStatus: TtsStatus;
  now: number;
  ttsChunkStartMs: number | null;
  ttsSpeechRate: number;
  ttsChunkWordCount: number;
  ttsChunkStartWordIndex: number;
  ttsCompletedSourceWords: number;
  baseWordsPerSecond?: number;
};

export type TtsSpokenWordEstimatorOptions = {
  sourceWordCount: number;
  ttsStatus: TtsStatus;
  ttsSpeechRate: number;
  ttsChunkStartMsRef: WritableRef<number | null>;
  ttsChunkWordCountRef: WritableRef<number>;
  ttsChunkStartWordIndexRef: WritableRef<number>;
  ttsCompletedSourceWordsRef: WritableRef<number>;
  baseWordsPerSecond?: number;
  nowMs?: () => number;
};

export function estimateTtsSpokenWordIndex({
  sourceWordCount,
  ttsStatus,
  now,
  ttsChunkStartMs,
  ttsSpeechRate,
  ttsChunkWordCount,
  ttsChunkStartWordIndex,
  ttsCompletedSourceWords,
  baseWordsPerSecond = DEFAULT_TTS_BASE_WORDS_PER_SECOND,
}: TtsSpokenWordEstimateInput): number {
  if (sourceWordCount === 0) {
    return 0;
  }

  if (ttsStatus === 'playing' && ttsChunkStartMs !== null) {
    const elapsedSec = Math.max(0, (now - ttsChunkStartMs) / 1000);
    const wordsPerSecond = Math.max(1, baseWordsPerSecond * ttsSpeechRate);
    const spokenInChunk = Math.min(ttsChunkWordCount, Math.floor(elapsedSec * wordsPerSecond));
    return clamp(ttsChunkStartWordIndex + spokenInChunk, 0, sourceWordCount);
  }

  if (ttsStatus === 'finished') {
    return sourceWordCount;
  }

  return clamp(ttsCompletedSourceWords, 0, sourceWordCount);
}

export function useTtsPlaybackProgressEstimator({
  sourceWordCount,
  ttsStatus,
  ttsSpeechRate,
  ttsChunkStartMsRef,
  ttsChunkWordCountRef,
  ttsChunkStartWordIndexRef,
  ttsCompletedSourceWordsRef,
  baseWordsPerSecond,
  nowMs = () => performance.now(),
}: TtsSpokenWordEstimatorOptions): (now?: number) => number {
  return useCallback(
    (now = nowMs()) =>
      estimateTtsSpokenWordIndex({
        sourceWordCount,
        ttsStatus,
        now,
        ttsChunkStartMs: ttsChunkStartMsRef.current,
        ttsSpeechRate,
        ttsChunkWordCount: ttsChunkWordCountRef.current,
        ttsChunkStartWordIndex: ttsChunkStartWordIndexRef.current,
        ttsCompletedSourceWords: ttsCompletedSourceWordsRef.current,
        baseWordsPerSecond,
      }),
    [
      baseWordsPerSecond,
      nowMs,
      sourceWordCount,
      ttsChunkStartMsRef,
      ttsChunkStartWordIndexRef,
      ttsChunkWordCountRef,
      ttsCompletedSourceWordsRef,
      ttsSpeechRate,
      ttsStatus,
    ],
  );
}
