import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {
  ControlAction,
  SessionTelemetry,
  Transcript,
} from '../src/types/dictation';
import {
  createTtsPlaybackMetricsRuntime,
  type TtsPlaybackMetricsRuntimeOptions,
} from '../src/app/useTtsPlaybackMetricsRuntime';
import type {
  TtsPublishedUiState,
} from '../src/app/sessionTypes';
import type { TtsLiveSignal } from '../src/app/ttsPlaybackProfile';

type Ref<T> = {
  current: T;
};

function ref<T>(current: T): Ref<T> {
  return { current };
}

function createTranscript(words: string[]): Transcript {
  return {
    words: words.map((word, index) => ({
      word,
      start: index,
      end: index + 0.5,
    })),
  };
}

function createOptions(
  overrides: Partial<TtsPlaybackMetricsRuntimeOptions> = {},
): TtsPlaybackMetricsRuntimeOptions {
  const publishedUi: TtsPublishedUiState = {
    controllerState: 'hold',
    rate: 1,
    lagSec: 0,
    lagWords: 0,
    wpm: 0,
    accuracy: 100,
    trend: 'stable',
  };
  const liveSignal: TtsLiveSignal = {
    accuracy: 100,
    lagSec: 0,
    rawLagSec: 0,
    stableLagSec: 0,
    lagOutlierCount: 0,
    wpm: 0,
    trend: 'stable',
    controllerState: 'hold',
  };

  return {
    ttsTranscript: createTranscript(['uno', 'dos', 'tres', 'cuatro']),
    ttsStatus: 'playing',
    ttsSpeechRate: 1,
    ttsLanguage: 'es',
    controllerState: 'hold',
    rate: 1,
    lagSec: 0,
    lagWords: 0,
    wpm: 0,
    accuracy: 100,
    trend: 'stable',
    telemetryRef: ref<SessionTelemetry | null>(null),
    ttsStartedAtMsRef: ref<number | null>(1000),
    ttsPracticeLiveTextRef: ref('uno dos'),
    ttsChunkStartMsRef: ref<number | null>(1000),
    ttsChunkWordCountRef: ref(4),
    ttsChunkStartWordIndexRef: ref(0),
    ttsCompletedSourceWordsRef: ref(0),
    ttsLastValidControlLagSecRef: ref(0),
    ttsLagOutlierCountRef: ref(0),
    ttsLiveSignalRef: ref(liveSignal),
    previousLagRef: ref(0),
    previousAccuracyRef: ref(100),
    ttsLastControllerActionRef: ref<ControlAction>('hold'),
    ttsPublishedUiRef: ref(publishedUi),
    ttsUiLastPublishedAtRef: ref(0),
    applyTtsPerformanceSampleRef: ref<() => void>(() => undefined),
    setControllerState: vi.fn(),
    setRate: vi.fn(),
    setLagSec: vi.fn(),
    setLagWords: vi.fn(),
    setWpm: vi.fn(),
    setAccuracy: vi.fn(),
    setTrend: vi.fn(),
    baseWordsPerSecond: 2.6,
    nowMs: () => 2000,
    nowIso: () => '2026-06-14T12:00:00.000Z',
    minPublishIntervalMs: 0,
    ...overrides,
  };
}

describe('TTS playback metrics runtime', () => {
  it('composes telemetry recording and spoken-word estimation', () => {
    const options = createOptions();
    const runtime = createTtsPlaybackMetricsRuntime(options);

    expect(runtime.estimateTtsSpokenWordIndex()).toBe(2);

    runtime.recordTtsTelemetryAction('play');

    expect(options.telemetryRef.current?.startedAt).toBe('2026-06-14T12:00:00.000Z');
    expect(options.telemetryRef.current?.actions).toEqual([
      { t: 1, action: 'play', rate: 1 },
    ]);
  });

  it('publishes the composed performance sampler through the mutable runtime ref', () => {
    const options = createOptions();
    const runtime = createTtsPlaybackMetricsRuntime(options);

    expect(options.applyTtsPerformanceSampleRef.current).toBe(runtime.applyTtsPerformanceSample);

    const result = options.applyTtsPerformanceSampleRef.current();

    expect(result.metrics.wpm).toBeGreaterThan(0);
    expect(result.telemetry.lagSeries.length).toBe(1);
    expect(options.telemetryRef.current?.lagSeries.length).toBe(1);
    expect(options.ttsLiveSignalRef.current.wpm).toBeGreaterThan(0);
  });

  it('returns the performance sample result when called directly', () => {
    const options = createOptions();
    const runtime = createTtsPlaybackMetricsRuntime(options);

    const result = runtime.applyTtsPerformanceSample({
      practiceTextOverride: 'uno dos tres',
      forcePublishUi: true,
    });

    expect(result.metrics.points).toBeGreaterThan(0);
    expect(result.metrics.accuracy).toBeGreaterThan(0);
    expect(options.ttsPublishedUiRef.current.accuracy).toBe(result.metrics.accuracy);
  });
});
