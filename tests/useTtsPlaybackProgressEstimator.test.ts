import { describe, expect, it } from 'vitest';
import {
  estimateTtsSpokenWordIndex,
} from '../src/app/useTtsPlaybackProgressEstimator';

describe('estimateTtsSpokenWordIndex', () => {
  it('returns zero when there are no source words', () => {
    expect(
      estimateTtsSpokenWordIndex({
        sourceWordCount: 0,
        ttsStatus: 'playing',
        now: 2000,
        ttsChunkStartMs: 1000,
        ttsSpeechRate: 1,
        ttsChunkWordCount: 8,
        ttsChunkStartWordIndex: 3,
        ttsCompletedSourceWords: 4,
      }),
    ).toBe(0);
  });

  it('estimates spoken words inside the active playing chunk', () => {
    expect(
      estimateTtsSpokenWordIndex({
        sourceWordCount: 20,
        ttsStatus: 'playing',
        now: 3000,
        ttsChunkStartMs: 1000,
        ttsSpeechRate: 1,
        ttsChunkWordCount: 8,
        ttsChunkStartWordIndex: 5,
        ttsCompletedSourceWords: 2,
        baseWordsPerSecond: 2.6,
      }),
    ).toBe(10);
  });

  it('does not move backward when the provided time is before the chunk start', () => {
    expect(
      estimateTtsSpokenWordIndex({
        sourceWordCount: 20,
        ttsStatus: 'playing',
        now: 500,
        ttsChunkStartMs: 1000,
        ttsSpeechRate: 1,
        ttsChunkWordCount: 8,
        ttsChunkStartWordIndex: 5,
        ttsCompletedSourceWords: 2,
      }),
    ).toBe(5);
  });

  it('uses a minimum one-word-per-second rate for very low speech rates', () => {
    expect(
      estimateTtsSpokenWordIndex({
        sourceWordCount: 20,
        ttsStatus: 'playing',
        now: 4000,
        ttsChunkStartMs: 1000,
        ttsSpeechRate: 0.1,
        ttsChunkWordCount: 10,
        ttsChunkStartWordIndex: 4,
        ttsCompletedSourceWords: 0,
      }),
    ).toBe(7);
  });

  it('caps active chunk progress to the chunk word count and source word count', () => {
    expect(
      estimateTtsSpokenWordIndex({
        sourceWordCount: 10,
        ttsStatus: 'playing',
        now: 20_000,
        ttsChunkStartMs: 1000,
        ttsSpeechRate: 2,
        ttsChunkWordCount: 8,
        ttsChunkStartWordIndex: 7,
        ttsCompletedSourceWords: 0,
      }),
    ).toBe(10);
  });

  it('returns full source progress for finished playback', () => {
    expect(
      estimateTtsSpokenWordIndex({
        sourceWordCount: 12,
        ttsStatus: 'finished',
        now: 0,
        ttsChunkStartMs: null,
        ttsSpeechRate: 1,
        ttsChunkWordCount: 0,
        ttsChunkStartWordIndex: 0,
        ttsCompletedSourceWords: 3,
      }),
    ).toBe(12);
  });

  it('falls back to clamped completed source words outside active playback', () => {
    expect(
      estimateTtsSpokenWordIndex({
        sourceWordCount: 12,
        ttsStatus: 'paused',
        now: 0,
        ttsChunkStartMs: null,
        ttsSpeechRate: 1,
        ttsChunkWordCount: 0,
        ttsChunkStartWordIndex: 0,
        ttsCompletedSourceWords: 20,
      }),
    ).toBe(12);

    expect(
      estimateTtsSpokenWordIndex({
        sourceWordCount: 12,
        ttsStatus: 'ready',
        now: 0,
        ttsChunkStartMs: null,
        ttsSpeechRate: 1,
        ttsChunkWordCount: 0,
        ttsChunkStartWordIndex: 0,
        ttsCompletedSourceWords: -2,
      }),
    ).toBe(0);
  });
});
