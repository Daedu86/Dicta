import { describe, expect, it } from 'vitest';
import { cloneTelemetry } from '../src/core/sessionNormalization';
import type {
  ControlAction,
  SessionTelemetry,
  Transcript,
} from '../src/types/dictation';
import {
  sampleTtsPerformance,
  type TtsPerformanceSamplerDependencies,
} from '../src/app/useTtsPerformanceSampler';
import type {
  TtsLanguage,
  TtsPublishedUiState,
} from '../src/app/sessionTypes';
import type { TtsLiveSignal } from '../src/app/ttsPlaybackProfile';

type Ref<T> = {
  current: T;
};

function ref<T>(current: T): Ref<T> {
  return { current };
}

function transcriptFromWords(words: string[]): Transcript {
  return {
    words: words.map((word, index) => ({
      word,
      start: index,
      end: index + 1,
    })),
  };
}

function createLiveSignal(): TtsLiveSignal {
  return {
    accuracy: 100,
    lagSec: 0,
    rawLagSec: 0,
    stableLagSec: 0,
    lagOutlierCount: 0,
    wpm: 0,
    trend: 'stable',
    controllerState: 'hold',
  };
}

function createSamplerDependencies(
  overrides: Partial<TtsPerformanceSamplerDependencies> = {},
): TtsPerformanceSamplerDependencies & {
  publishedUi: Array<{ next: TtsPublishedUiState; now: number; force?: boolean }>;
} {
  const ttsStartedAtMsRef = ref<number | null>(null);
  const telemetryRef = ref<SessionTelemetry | null>(null);
  const publishedUi: Array<{ next: TtsPublishedUiState; now: number; force?: boolean }> = [];

  const deps: TtsPerformanceSamplerDependencies = {
    ttsStartedAtMsRef,
    ttsPracticeLiveTextRef: ref('hello world again'),
    ttsTranscript: transcriptFromWords(['hello', 'world', 'again', 'now']),
    ttsSpeechRate: 1,
    ttsLanguage: 'en',
    ttsLastValidControlLagSecRef: ref(0),
    ttsLagOutlierCountRef: ref(0),
    ttsLiveSignalRef: ref(createLiveSignal()),
    previousLagRef: ref(0),
    previousAccuracyRef: ref(100),
    telemetryRef,
    ttsLastControllerActionRef: ref<ControlAction>('hold'),
    estimateTtsSpokenWordIndex: () => 4,
    getTtsElapsedSeconds: (now = 10_000) =>
      ttsStartedAtMsRef.current === null ? 0 : Math.max(0, (now - ttsStartedAtMsRef.current) / 1000),
    ensureAttemptTelemetry: () => {
      const next = cloneTelemetry(telemetryRef.current);
      if (!next.startedAt) {
        next.startedAt = '2026-06-12T10:00:00.000Z';
      }
      telemetryRef.current = next;
      return next;
    },
    publishTtsUiState: (next, now, force) => {
      publishedUi.push({ next, now, force });
    },
    nowMs: () => 10_000,
    nowIso: () => '2026-06-12T12:00:00.000Z',
    ...overrides,
  };

  return {
    ...deps,
    publishedUi,
  };
}

describe('sampleTtsPerformance', () => {
  it('initializes playback time, publishes metrics, and tracks a controller action transition', () => {
    const deps = createSamplerDependencies();

    const result = sampleTtsPerformance(deps);

    expect(deps.ttsStartedAtMsRef.current).toBe(10_000);
    expect(result.metrics).toMatchObject({
      controllerState: 'speed_up',
      rate: 1,
      lagWords: 1,
      wpm: 180,
      accuracy: 100,
      trend: 'stable',
      points: 3,
    });
    expect(result.metrics.lagSec).toBeCloseTo(1 / 2.6, 3);
    expect(result.metrics.score).toBe(120);
    expect(deps.ttsLiveSignalRef.current).toMatchObject({
      controllerState: 'speed_up',
      accuracy: 100,
      wpm: 180,
    });
    expect(deps.previousLagRef.current).toBeCloseTo(1 / 2.6, 3);
    expect(deps.previousAccuracyRef.current).toBe(100);
    expect(deps.ttsLastControllerActionRef.current).toBe('speed_up');
    expect(deps.telemetryRef.current?.lagSeries).toEqual([0.385]);
    expect(deps.telemetryRef.current?.wpmSeries).toEqual([180]);
    expect(deps.telemetryRef.current?.accuracySeries).toEqual([100]);
    expect(deps.telemetryRef.current?.actions).toEqual([
      { t: 0, action: 'speed_up', rate: 1 },
    ]);
    expect(deps.publishedUi).toHaveLength(1);
    expect(deps.publishedUi[0]).toMatchObject({
      now: 10_000,
      force: false,
      next: {
        controllerState: 'speed_up',
        lagWords: 1,
        wpm: 180,
        accuracy: 100,
      },
    });
  });

  it('uses practiceTextOverride, records explicit action, and finalizes telemetry', () => {
    const deps = createSamplerDependencies({
      ttsPracticeLiveTextRef: ref('wrong words should not count'),
      ttsTranscript: transcriptFromWords(['alpha', 'beta', 'gamma']),
      estimateTtsSpokenWordIndex: () => 2,
    });

    const result = sampleTtsPerformance(deps, {
      action: 'submit',
      finalize: true,
      practiceTextOverride: 'alpha beta',
    });

    expect(result.metrics.points).toBe(2);
    expect(result.metrics.accuracy).toBe(100);
    expect(deps.telemetryRef.current?.actions).toEqual([
      { t: 0, action: 'submit', rate: 1 },
    ]);
    expect(deps.telemetryRef.current?.finishedAt).toBe('2026-06-12T12:00:00.000Z');
    expect(deps.publishedUi[0]?.force).toBe(true);
  });

  it('falls back to the previous valid German control lag for raw lag outliers', () => {
    const transcript = transcriptFromWords(Array.from({ length: 30 }, (_, index) => `wort${index}`));
    const deps = createSamplerDependencies({
      ttsTranscript: transcript,
      ttsPracticeLiveTextRef: ref(''),
      ttsLanguage: 'de' as TtsLanguage,
      ttsLastValidControlLagSecRef: ref(1.25),
      estimateTtsSpokenWordIndex: () => 30,
    });

    const result = sampleTtsPerformance(deps);

    expect(result.metrics.lagSec).toBe(1.25);
    expect(result.metrics.lagWords).toBe(30);
    expect(deps.ttsLagOutlierCountRef.current).toBe(1);
    expect(deps.ttsLastValidControlLagSecRef.current).toBe(1.25);
    expect(deps.ttsLiveSignalRef.current).toMatchObject({
      rawLagSec: 30 / 2.6,
      stableLagSec: 1.25,
      lagOutlierCount: 1,
    });
  });
});
