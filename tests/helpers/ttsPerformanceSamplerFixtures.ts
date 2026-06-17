import { cloneTelemetry } from '../../src/core/sessionNormalization';
import type {
  ControlAction,
  SessionTelemetry,
  Transcript,
} from '../../src/types/dictation';
import type { TtsPerformanceSamplerDependencies } from '../../src/app/useTtsPerformanceSampler';
import type {
  TtsPublishedUiState,
} from '../../src/app/sessionTypes';
import type { TtsLiveSignal } from '../../src/app/ttsPlaybackProfile';

export type Ref<T> = {
  current: T;
};

export function ref<T>(current: T): Ref<T> {
  return { current };
}

export function transcriptFromWords(words: string[]): Transcript {
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

export function createSamplerDependencies(
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
