import { describe, expect, it } from 'vitest';
import {
  SESSION_PERSIST_RECOVERY_ACTION_LIMIT,
  SESSION_PERSIST_RECOVERY_RATE_DISTRIBUTION_LIMIT,
  SESSION_PERSIST_RECOVERY_SERIES_LIMIT,
  SESSION_PERSIST_RECOVERY_TTS_CHUNK_LIMIT,
  compactTelemetryForStorage,
} from '../src/app/sessionPersistenceCompaction';
import type { ControlAction, SessionTelemetry } from '../src/types/dictation';

function numbers(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function telemetry(overrides: Partial<SessionTelemetry> = {}): SessionTelemetry {
  return {
    startedAt: '2026-06-15T10:00:00.000Z',
    finishedAt: '2026-06-15T10:05:00.000Z',
    lagSeries: [],
    wpmSeries: [],
    accuracySeries: [],
    actions: [],
    ttsChunks: [],
    repeatCount: 7,
    rateDistribution: [],
    ...overrides,
  };
}

describe('sessionPersistenceCompaction', () => {
  it('keeps only the latest recovery telemetry samples', () => {
    const source = telemetry({
      lagSeries: numbers(SESSION_PERSIST_RECOVERY_SERIES_LIMIT + 5),
      wpmSeries: numbers(SESSION_PERSIST_RECOVERY_SERIES_LIMIT + 6),
      accuracySeries: numbers(SESSION_PERSIST_RECOVERY_SERIES_LIMIT + 7),
      actions: Array.from({ length: SESSION_PERSIST_RECOVERY_ACTION_LIMIT + 3 }, (_, index) => ({
        t: index,
        action: 'play' as ControlAction,
        rate: 1,
      })),
      ttsChunks: Array.from({ length: SESSION_PERSIST_RECOVERY_TTS_CHUNK_LIMIT + 2 }, (_, index) => ({
        t: index,
        startWordIndex: index,
        wordCount: 3,
        rate: 1,
        pacingMode: 'balanced',
      })),
      rateDistribution: Array.from({ length: SESSION_PERSIST_RECOVERY_RATE_DISTRIBUTION_LIMIT + 4 }, (_, index) => ({
        rate: 1 + index / 100,
        seconds: index,
      })),
    });

    const compacted = compactTelemetryForStorage(source);

    expect(compacted.lagSeries).toEqual(numbers(SESSION_PERSIST_RECOVERY_SERIES_LIMIT + 5).slice(-SESSION_PERSIST_RECOVERY_SERIES_LIMIT));
    expect(compacted.wpmSeries).toEqual(numbers(SESSION_PERSIST_RECOVERY_SERIES_LIMIT + 6).slice(-SESSION_PERSIST_RECOVERY_SERIES_LIMIT));
    expect(compacted.accuracySeries).toEqual(numbers(SESSION_PERSIST_RECOVERY_SERIES_LIMIT + 7).slice(-SESSION_PERSIST_RECOVERY_SERIES_LIMIT));
    expect(compacted.actions).toHaveLength(SESSION_PERSIST_RECOVERY_ACTION_LIMIT);
    expect(compacted.actions[0]?.t).toBe(3);
    expect(compacted.ttsChunks).toHaveLength(SESSION_PERSIST_RECOVERY_TTS_CHUNK_LIMIT);
    expect(compacted.ttsChunks[0]?.startWordIndex).toBe(2);
    expect(compacted.rateDistribution).toHaveLength(SESSION_PERSIST_RECOVERY_RATE_DISTRIBUTION_LIMIT);
    expect(compacted.rateDistribution[0]?.seconds).toBe(4);
  });

  it('preserves non-series telemetry fields and leaves the source untouched', () => {
    const source = telemetry({
      lagSeries: numbers(3),
      wpmSeries: numbers(2),
      accuracySeries: numbers(1),
    });

    const compacted = compactTelemetryForStorage(source);

    expect(compacted).toMatchObject({
      startedAt: source.startedAt,
      finishedAt: source.finishedAt,
      repeatCount: source.repeatCount,
    });
    expect(compacted.lagSeries).toEqual([1, 2, 3]);
    expect(source.lagSeries).toEqual([1, 2, 3]);
    expect(compacted).not.toBe(source);
  });
});
