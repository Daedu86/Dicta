import { describe, expect, it } from 'vitest';
import {
  normalizeLiveSessionStatusForPersistence,
  normalizeRestoredSessionStatus,
} from '../src/core/sessionStatusNormalization';
import type { SessionTelemetry } from '../src/types/dictation';

const emptyTelemetry: SessionTelemetry = {
  startedAt: '',
  lagSeries: [],
  wpmSeries: [],
  accuracySeries: [],
  actions: [],
  ttsChunks: [],
  repeatCount: 0,
  rateDistribution: [],
};

describe('session status normalization', () => {
  it('reopens persisted running sessions as paused because playback cannot survive reload or sync', () => {
    expect(normalizeRestoredSessionStatus('running', emptyTelemetry)).toBe('paused');
  });

  it('preserves finished state when telemetry has a finished timestamp', () => {
    expect(normalizeRestoredSessionStatus('running', { ...emptyTelemetry, finishedAt: '2026-05-13T10:00:00.000Z' })).toBe('finished');
    expect(normalizeLiveSessionStatusForPersistence('running', { ...emptyTelemetry, finishedAt: '2026-05-13T10:00:00.000Z' }, true)).toBe('finished');
  });

  it('does not persist a running state when no playback is active locally', () => {
    expect(normalizeLiveSessionStatusForPersistence('running', emptyTelemetry, false)).toBe('paused');
    expect(normalizeLiveSessionStatusForPersistence('running', emptyTelemetry, true)).toBe('running');
  });
});
