import { describe, expect, it } from 'vitest';
import { cloneTelemetry } from '../src/core/sessionNormalization';
import type { SessionTelemetry } from '../src/types/dictation';
import {
  createTtsTelemetryRecorder,
  type TtsTelemetryRecorderOptions,
} from '../src/app/useTtsTelemetryRecorder';

type Ref<T> = {
  current: T;
};

function ref<T>(current: T): Ref<T> {
  return { current };
}

function createRecorder(
  overrides: Partial<TtsTelemetryRecorderOptions> = {},
): ReturnType<typeof createTtsTelemetryRecorder> & {
  telemetryRef: Ref<SessionTelemetry | null>;
  ttsStartedAtMsRef: Ref<number | null>;
} {
  const telemetryRef = overrides.telemetryRef ?? ref<SessionTelemetry | null>(null);
  const ttsStartedAtMsRef = overrides.ttsStartedAtMsRef ?? ref<number | null>(1000);
  const recorder = createTtsTelemetryRecorder({
    telemetryRef,
    ttsStartedAtMsRef,
    ttsSpeechRate: 1.25,
    nowMs: () => 2500,
    nowIso: () => '2026-06-12T12:00:00.000Z',
    ...overrides,
  });

  return {
    ...recorder,
    telemetryRef,
    ttsStartedAtMsRef,
  };
}

describe('createTtsTelemetryRecorder', () => {
  it('initializes attempt telemetry with a startedAt timestamp', () => {
    const recorder = createRecorder();

    const telemetry = recorder.ensureAttemptTelemetry();

    expect(telemetry.startedAt).toBe('2026-06-12T12:00:00.000Z');
    expect(recorder.telemetryRef.current).toEqual(telemetry);
  });

  it('preserves existing startedAt and computes non-negative elapsed seconds', () => {
    const telemetryRef = ref<SessionTelemetry | null>({
      ...cloneTelemetry(null),
      startedAt: '2026-06-12T10:00:00.000Z',
    });
    const recorder = createRecorder({
      telemetryRef,
      ttsStartedAtMsRef: ref(2000),
      nowIso: () => '2026-06-12T12:00:00.000Z',
    });

    expect(recorder.ensureAttemptTelemetry().startedAt).toBe('2026-06-12T10:00:00.000Z');
    expect(recorder.getTtsElapsedSeconds(5000)).toBe(3);
    expect(recorder.getTtsElapsedSeconds(1000)).toBe(0);
  });

  it('returns zero elapsed seconds before playback start', () => {
    const recorder = createRecorder({
      ttsStartedAtMsRef: ref<number | null>(null),
    });

    expect(recorder.getTtsElapsedSeconds()).toBe(0);
  });

  it('records telemetry actions with default and explicit rates', () => {
    const recorder = createRecorder();

    recorder.recordTtsTelemetryAction('play');
    recorder.recordTtsTelemetryAction('seek', 0.8);

    expect(recorder.telemetryRef.current?.actions).toEqual([
      { t: 1.5, action: 'play', rate: 1.25 },
      { t: 1.5, action: 'seek', rate: 0.8 },
    ]);
  });

  it('keeps pause-repeat counting through the shared telemetry tracker', () => {
    const recorder = createRecorder();

    recorder.recordTtsTelemetryAction('pause_repeat');

    expect(recorder.telemetryRef.current?.repeatCount).toBe(1);
  });

  it('records TTS chunk telemetry with elapsed timestamps', () => {
    const recorder = createRecorder();

    recorder.recordTtsChunkTelemetry({
      startWordIndex: 4,
      wordCount: 6,
      rate: 0.9,
      pacingMode: 'slow',
    });

    expect(recorder.telemetryRef.current?.ttsChunks).toEqual([
      {
        t: 1.5,
        startWordIndex: 4,
        wordCount: 6,
        rate: 0.9,
        pacingMode: 'slow',
      },
    ]);
  });
});
