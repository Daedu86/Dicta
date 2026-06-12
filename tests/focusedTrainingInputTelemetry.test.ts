import { describe, expect, it } from 'vitest';
import type { SessionTelemetry } from '../src/types/dictation';
import {
  applyFocusedImmediateInputTelemetry,
} from '../src/app/focusedTrainingInputTelemetry';
import { cloneTelemetry } from '../src/core/sessionNormalization';

describe('focused training input telemetry', () => {
  it('initializes telemetry startedAt when missing', () => {
    const result = applyFocusedImmediateInputTelemetry({
      value: 'typed text',
      telemetry: null,
      ttsStartedAtMs: null,
      nowIso: () => '2026-06-12T12:00:00.000Z',
      nowMs: () => 1234,
    });

    expect(result.telemetry.startedAt).toBe('2026-06-12T12:00:00.000Z');
    expect(result.ttsStartedAtMs).toBe(1234);
    expect(result.liveText).toBe('typed text');
  });

  it('preserves an existing telemetry startedAt object', () => {
    const telemetry: SessionTelemetry = {
      ...cloneTelemetry(null),
      startedAt: '2026-06-12T10:00:00.000Z',
      lagSeries: [1, 2],
    };

    const result = applyFocusedImmediateInputTelemetry({
      value: 'new live text',
      telemetry,
      ttsStartedAtMs: null,
      nowIso: () => '2026-06-12T12:00:00.000Z',
      nowMs: () => 99,
    });

    expect(result.telemetry).toBe(telemetry);
    expect(result.telemetry.startedAt).toBe('2026-06-12T10:00:00.000Z');
    expect(result.telemetry.lagSeries).toEqual([1, 2]);
    expect(result.ttsStartedAtMs).toBe(99);
    expect(result.liveText).toBe('new live text');
  });

  it('initializes ttsStartedAtMs only when it is null', () => {
    const result = applyFocusedImmediateInputTelemetry({
      value: 'typed',
      telemetry: cloneTelemetry(null),
      ttsStartedAtMs: 456,
      nowIso: () => '2026-06-12T12:00:00.000Z',
      nowMs: () => 999,
    });

    expect(result.ttsStartedAtMs).toBe(456);
  });

  it('clones legacy telemetry with missing startedAt before adding the new timestamp', () => {
    const telemetry = {
      lagSeries: [3],
      wpmSeries: [40],
      accuracySeries: [95],
      actions: [],
      ttsChunks: [],
      repeatCount: 2,
      rateDistribution: [{ rate: 1, seconds: 5 }],
    } as unknown as SessionTelemetry;

    const result = applyFocusedImmediateInputTelemetry({
      value: 'abc',
      telemetry,
      ttsStartedAtMs: null,
      nowIso: () => '2026-06-12T12:00:00.000Z',
      nowMs: () => 321,
    });

    expect(result.telemetry).not.toBe(telemetry);
    expect(result.telemetry.startedAt).toBe('2026-06-12T12:00:00.000Z');
    expect(result.telemetry.lagSeries).toEqual([3]);
    expect(result.telemetry.wpmSeries).toEqual([40]);
    expect(result.telemetry.accuracySeries).toEqual([95]);
    expect(result.telemetry.repeatCount).toBe(2);
  });

  it('always returns the latest live text value', () => {
    const result = applyFocusedImmediateInputTelemetry({
      value: 'latest immediate value',
      telemetry: {
        ...cloneTelemetry(null),
        startedAt: '2026-06-12T10:00:00.000Z',
      },
      ttsStartedAtMs: 1,
      nowIso: () => '2026-06-12T12:00:00.000Z',
      nowMs: () => 2,
    });

    expect(result.liveText).toBe('latest immediate value');
  });
});
