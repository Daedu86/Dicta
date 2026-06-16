import type {
  ControlAction,
  SessionTelemetry,
  Transcript,
  TtsChunkTelemetry,
} from '../types/dictation';
import type { TtsPerformanceSampleOptions } from './useTtsPerformanceSampler';
import type {
  TtsLanguage,
  TtsPerformanceSampleResult,
  TtsPublishedUiState,
  TtsStatus,
} from './sessionTypes';
import type { TtsLiveSignal } from './ttsPlaybackProfile';

export type WritableRef<T> = {
  current: T;
};

export type StateSetter<T> = (value: T | ((current: T) => T)) => void;

export type TtsPlaybackMetricsRuntimeOptions = {
  ttsTranscript: Transcript | null;
  ttsStatus: TtsStatus;
  ttsSpeechRate: number;
  ttsLanguage: TtsLanguage;
  controllerState: ControlAction;
  rate: number;
  lagSec: number;
  lagWords: number;
  wpm: number;
  accuracy: number;
  trend: TtsPublishedUiState['trend'];
  telemetryRef: WritableRef<SessionTelemetry | null>;
  ttsStartedAtMsRef: WritableRef<number | null>;
  ttsPracticeLiveTextRef: WritableRef<string>;
  ttsChunkStartMsRef: WritableRef<number | null>;
  ttsChunkWordCountRef: WritableRef<number>;
  ttsChunkStartWordIndexRef: WritableRef<number>;
  ttsCompletedSourceWordsRef: WritableRef<number>;
  ttsLastValidControlLagSecRef: WritableRef<number>;
  ttsLagOutlierCountRef: WritableRef<number>;
  ttsLiveSignalRef: WritableRef<TtsLiveSignal>;
  previousLagRef: WritableRef<number>;
  previousAccuracyRef: WritableRef<number>;
  ttsLastControllerActionRef: WritableRef<ControlAction>;
  ttsPublishedUiRef: WritableRef<TtsPublishedUiState>;
  ttsUiLastPublishedAtRef: WritableRef<number>;
  applyTtsPerformanceSampleRef: WritableRef<() => void>;
  setControllerState: StateSetter<ControlAction>;
  setRate: StateSetter<number>;
  setLagSec: StateSetter<number>;
  setLagWords: StateSetter<number>;
  setWpm: StateSetter<number>;
  setAccuracy: StateSetter<number>;
  setTrend: StateSetter<TtsPublishedUiState['trend']>;
  baseWordsPerSecond: number;
  minPublishIntervalMs?: number;
  nowMs?: () => number;
  nowIso?: () => string;
};

export type TtsPlaybackMetricsRuntime = {
  ensureAttemptTelemetry: () => SessionTelemetry;
  getTtsElapsedSeconds: (now?: number) => number;
  recordTtsTelemetryAction: (action: ControlAction, actionRate?: number) => void;
  recordTtsChunkTelemetry: (chunk: Omit<TtsChunkTelemetry, 't'>) => void;
  estimateTtsSpokenWordIndex: (now?: number) => number;
  applyTtsPerformanceSample: (options?: TtsPerformanceSampleOptions) => TtsPerformanceSampleResult;
};
