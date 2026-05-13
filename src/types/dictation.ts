export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface Transcript {
  words: WordTiming[];
}

export interface TypingEvent {
  t: number;
  key: string;
  correct?: boolean;
}

export type ControlAction =
  | 'hold'
  | 'speed_up'
  | 'speed_down'
  | 'pause_repeat'
  | 'play'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'seek'
  | 'submit'
  | 'replay_phrase'
  | 'rewind_phrase'
  | 'manual_slow'
  | 'manual_fast'
  | 'reset_pace'
  | 'phrase_start'
  | 'phrase_end';

export type TtsPacingMode = 'slow' | 'balanced' | 'flow';

export interface TtsChunkTelemetry {
  t: number;
  startWordIndex: number;
  wordCount: number;
  rate: number;
  pacingMode: TtsPacingMode;
  engine?: 'browser' | 'kokoro' | 'qwen-cloud';
  cacheKey?: string;
  durationSec?: number;
}

export interface SyncState {
  audioTime: number;
  typedWordIndex: number;
  expectedWordIndex: number;
  lagWords: number;
  lagSec: number;
  wpm: number;
  accuracy: number;
}

export interface ControllerConfig {
  minRate: number;
  maxRate: number;
  tickMs: number;
  hysteresisMs: number;
  lagSoftSec: number;
  lagHardSec: number;
  aheadSoftSec: number;
  repeatWords: number;
  maxRepeatPerMinute: number;
  repeatCooldownSec: number;
}

export interface SessionTelemetry {
  startedAt: string;
  finishedAt?: string;
  lagSeries: number[];
  wpmSeries: number[];
  accuracySeries: number[];
  actions: Array<{ t: number; action: ControlAction; rate: number }>;
  ttsChunks: TtsChunkTelemetry[];
  repeatCount: number;
  rateDistribution: Array<{ rate: number; seconds: number }>;
}
