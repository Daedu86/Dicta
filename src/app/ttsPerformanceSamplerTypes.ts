import type { ControlAction, SessionTelemetry, Transcript } from '../types/dictation';
import type { TtsLanguage, TtsPublishedUiState } from './sessionTypes';
import type { TtsLiveSignal } from './ttsPlaybackProfile';

export type WritableRef<T> = {
  current: T;
};

export type TtsPerformanceSampleOptions = {
  action?: ControlAction;
  finalize?: boolean;
  forcePublishUi?: boolean;
  practiceTextOverride?: string;
};

export type TtsPerformanceSamplerDependencies = {
  ttsStartedAtMsRef: WritableRef<number | null>;
  ttsPracticeLiveTextRef: WritableRef<string>;
  ttsTranscript: Transcript | null;
  ttsSpeechRate: number;
  ttsLanguage: TtsLanguage;
  ttsLastValidControlLagSecRef: WritableRef<number>;
  ttsLagOutlierCountRef: WritableRef<number>;
  ttsLiveSignalRef: WritableRef<TtsLiveSignal>;
  previousLagRef: WritableRef<number>;
  previousAccuracyRef: WritableRef<number>;
  telemetryRef: WritableRef<SessionTelemetry | null>;
  ttsLastControllerActionRef: WritableRef<ControlAction>;
  estimateTtsSpokenWordIndex: (now?: number) => number;
  getTtsElapsedSeconds: (now?: number) => number;
  ensureAttemptTelemetry: () => SessionTelemetry;
  publishTtsUiState: (next: TtsPublishedUiState, now: number, force?: boolean) => void;
  nowMs?: () => number;
  nowIso?: () => string;
};
